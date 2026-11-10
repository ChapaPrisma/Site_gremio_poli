-- Reclamações sobre disciplinas (Mapa das disciplinas, aluno/disciplinas/). Rode no SQL Editor do Supabase
-- depois do contas.sql (usa public.eh_administrador()). Pode rodar antes ou depois do problemas.sql.
--
-- Quem lê o quê:
--   - o público NÃO lê a tabela: vê só as contagens por disciplina e por natureza (função resumo_reclamacoes),
--     e nunca o texto. Isso protege professores e alunos de exposição e mantém o foco na disciplina;
--   - os administradores leem tudo por extenso no portal interno (admin/#reclamacoes), mudam a situação e apagam.
-- Quem escreve:
--   - qualquer pessoa registra (sem conta), com limites contra enxurrada: uma reclamação por conexão para a mesma
--     disciplina e o mesmo semestre, 10 por hora por conexão (o endereço de rede vira um código embaralhado e nunca
--     é guardado em claro) e 800 por dia no total.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.reclamacoes_disciplinas (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  sigla text not null check (sigla ~ '^[A-Z0-9]{7}$'),
  categorias text[] not null check (
    cardinality(categorias) between 1 and 3
    and categorias <@ array['didatica', 'carga', 'avaliacao', 'conteudo', 'material', 'organizacao', 'turmas', 'laboratorio', 'outro']::text[]
  ),
  semestre text check (semestre is null or semestre ~ '^20[0-9]{2}\.[12]$'),
  texto text check (texto is null or char_length(texto) <= 500),
  situacao text not null default 'nova' check (situacao in ('nova', 'lida', 'levada', 'descartada')),
  nota_gestao text check (nota_gestao is null or char_length(nota_gestao) <= 1000),
  conexao text                                     -- código embaralhado da conexão, só para os limites
);
create index if not exists reclamacoes_disciplinas_criado on public.reclamacoes_disciplinas (criado_em desc);
create index if not exists reclamacoes_disciplinas_sigla on public.reclamacoes_disciplinas (sigla);

-- código da conexão de quem está pedindo (mesma função do mapa de problemas; o endereço nunca é guardado)
create or replace function public.codigo_conexao() returns text
language sql stable as $$
  select encode(extensions.digest(coalesce(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), 'sem-endereco') || ':mapa-de-problemas', 'sha256'), 'hex');
$$;

-- antes de cada registro: carimba a conexão, impõe os valores iniciais e aplica os limites
create or replace function public.reclamacoes_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.eh_administrador() then return new; end if;
  new.conexao := public.codigo_conexao();
  new.situacao := 'nova'; new.nota_gestao := null; new.criado_em := now();
  new.texto := nullif(btrim(new.texto), '');
  select array_agg(distinct c) into new.categorias from unnest(new.categorias) c;
  if exists (select 1 from public.reclamacoes_disciplinas where conexao = new.conexao and sigla = new.sigla and coalesce(semestre, '') = coalesce(new.semestre, '')) then
    raise exception 'repetida: você já comentou esta disciplina neste semestre';
  end if;
  if (select count(*) from public.reclamacoes_disciplinas where conexao = new.conexao and criado_em > now() - interval '1 hour') >= 10 then
    raise exception 'limite: muitos registros seguidos desta conexão; tente daqui a pouco';
  end if;
  if (select count(*) from public.reclamacoes_disciplinas where criado_em > now() - interval '1 day') >= 800 then
    raise exception 'limite: o mapa recebeu registros demais hoje; tente amanhã';
  end if;
  return new;
end $$;
drop trigger if exists reclamacoes_antes on public.reclamacoes_disciplinas;
create trigger reclamacoes_antes before insert on public.reclamacoes_disciplinas for each row execute function public.reclamacoes_antes();

alter table public.reclamacoes_disciplinas enable row level security;

-- o público só insere (sem ler nada de volta); os administradores leem, mudam e apagam
revoke all on public.reclamacoes_disciplinas from anon;
grant insert (sigla, categorias, semestre, texto) on public.reclamacoes_disciplinas to anon, authenticated;

drop policy if exists "qualquer um comenta" on public.reclamacoes_disciplinas;
create policy "qualquer um comenta" on public.reclamacoes_disciplinas for insert to anon, authenticated with check (situacao = 'nova');
drop policy if exists "administradores leem" on public.reclamacoes_disciplinas;
create policy "administradores leem" on public.reclamacoes_disciplinas for select to authenticated using (public.eh_administrador());
drop policy if exists "administradores cuidam" on public.reclamacoes_disciplinas;
create policy "administradores cuidam" on public.reclamacoes_disciplinas for update to authenticated using (public.eh_administrador()) with check (public.eh_administrador());
drop policy if exists "administradores apagam" on public.reclamacoes_disciplinas;
create policy "administradores apagam" on public.reclamacoes_disciplinas for delete to authenticated using (public.eh_administrador());

-- O que o público vê: quantas reclamações cada disciplina recebeu em cada natureza (sem texto, sem data exata,
-- sem as descartadas pela gestão). Uma reclamação com duas naturezas conta nas duas; "pessoas" conta uma vez só.
create or replace function public.resumo_reclamacoes()
returns table (sigla text, categoria text, total bigint, pessoas bigint, ultima date)
language sql stable security definer set search_path = public as $$
  select r.sigla, c as categoria, count(*) as total,
         (select count(*) from public.reclamacoes_disciplinas x where x.sigla = r.sigla and x.situacao <> 'descartada') as pessoas,
         max(r.criado_em)::date as ultima
  from public.reclamacoes_disciplinas r, unnest(r.categorias) c
  where r.situacao <> 'descartada'
  group by r.sigla, c;
$$;
revoke all on function public.resumo_reclamacoes() from public;
grant execute on function public.resumo_reclamacoes() to anon, authenticated;
