-- Mapa de problemas do campus (aluno/demandas/#mapa): bebedouro quebrado, banheiro sem papel, poste apagado...
-- Rode no SQL Editor do Supabase depois do contas.sql (usa public.eh_administrador()).
--
-- Quem lê o quê:
--   - qualquer pessoa vê no mapa a categoria, o texto, a data, o lugar, a situação e quantos apoiaram;
--   - as fotos ficam num bucket privado: só os administradores veem (portal interno), por link temporário;
--   - os registros descartados pela gestão somem do mapa público.
-- Quem escreve:
--   - qualquer pessoa registra um problema (sem conta), com limites contra enxurrada: 6 registros por hora por
--     conexão (pelo endereço de rede, guardado só como um código embaralhado) e 400 por dia no total;
--   - a foto só pode ser enviada logo depois do registro, com o nome "<id do registro>.jpg";
--   - "eu também vi isso" soma um apoio, uma vez por conexão em cada problema;
--   - só os administradores mudam a situação, respondem ou apagam.

create table if not exists public.problemas (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  categoria text not null check (categoria in ('agua', 'banheiro', 'iluminacao', 'limpeza', 'estrutura', 'climatizacao', 'internet', 'acessibilidade', 'seguranca', 'outro')),
  texto text not null check (char_length(texto) between 3 and 500),
  lat double precision not null check (lat between -23.575 and -23.540),
  lon double precision not null check (lon between -46.750 and -46.715),
  precisao real,                                   -- metros, como o celular informou
  origem_local text not null default 'gps' check (origem_local in ('gps', 'foto', 'mapa')),
  tem_foto boolean not null default false,
  situacao text not null default 'aberto' check (situacao in ('aberto', 'encaminhado', 'resolvido', 'descartado')),
  apoios integer not null default 0,
  resposta text check (resposta is null or char_length(resposta) <= 1000),
  conexao text                                     -- código embaralhado da conexão, só para os limites
);
create index if not exists problemas_criado on public.problemas (criado_em desc);

create table if not exists public.problemas_apoios (
  problema_id uuid not null references public.problemas (id) on delete cascade,
  conexao text not null,
  criado_em timestamptz not null default now(),
  primary key (problema_id, conexao)
);

-- código da conexão de quem está pedindo (o endereço nunca é guardado em claro)
create or replace function public.codigo_conexao() returns text
language sql stable as $$
  select encode(extensions.digest(coalesce(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1), 'sem-endereco') || ':mapa-de-problemas', 'sha256'), 'hex');
$$;

-- antes de cada registro: carimba a conexão, impõe os valores iniciais e aplica os limites
create or replace function public.problemas_antes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.eh_administrador() then return new; end if;
  new.conexao := public.codigo_conexao();
  new.situacao := 'aberto'; new.apoios := 0; new.resposta := null; new.criado_em := now();
  if (select count(*) from public.problemas where conexao = new.conexao and criado_em > now() - interval '1 hour') >= 6 then
    raise exception 'limite: muitos registros seguidos desta conexão; tente daqui a pouco';
  end if;
  if (select count(*) from public.problemas where criado_em > now() - interval '1 day') >= 400 then
    raise exception 'limite: o mapa recebeu registros demais hoje; tente amanhã';
  end if;
  return new;
end $$;
drop trigger if exists problemas_antes on public.problemas;
create trigger problemas_antes before insert on public.problemas for each row execute function public.problemas_antes();

-- "eu também vi isso": um apoio por conexão em cada problema
create or replace function public.apoiar_problema(p_id uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare total integer;
begin
  insert into public.problemas_apoios (problema_id, conexao) values (p_id, public.codigo_conexao()) on conflict do nothing;
  if found then update public.problemas set apoios = apoios + 1 where id = p_id and situacao <> 'descartado'; end if;
  select apoios into total from public.problemas where id = p_id;
  return total;
end $$;
grant execute on function public.apoiar_problema(uuid) to anon, authenticated;

alter table public.problemas enable row level security;
alter table public.problemas_apoios enable row level security;

-- o público lê só estas colunas (a conexão nunca sai do banco)
revoke all on public.problemas from anon;
grant select (id, criado_em, categoria, texto, lat, lon, precisao, origem_local, tem_foto, situacao, apoios, resposta) on public.problemas to anon;
grant insert (categoria, texto, lat, lon, precisao, origem_local, tem_foto) on public.problemas to anon;
revoke all on public.problemas_apoios from anon;

drop policy if exists "problemas públicos" on public.problemas;
create policy "problemas públicos" on public.problemas for select using (situacao <> 'descartado' or public.eh_administrador());
drop policy if exists "qualquer um registra" on public.problemas;
create policy "qualquer um registra" on public.problemas for insert with check (situacao = 'aberto' and apoios = 0);
drop policy if exists "administradores cuidam" on public.problemas;
create policy "administradores cuidam" on public.problemas for update to authenticated using (public.eh_administrador()) with check (public.eh_administrador());
drop policy if exists "administradores apagam" on public.problemas;
create policy "administradores apagam" on public.problemas for delete to authenticated using (public.eh_administrador());

-- fotos: bucket privado, até 1,5 MB, só imagem
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('problemas', 'problemas', false, 1572864, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- a foto só entra logo depois do registro, com o id dele no nome, e só se o registro disse que teria foto
drop policy if exists "foto do problema recém-registrado" on storage.objects;
create policy "foto do problema recém-registrado" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'problemas'
    and exists (select 1 from public.problemas p where p.id::text = split_part(name, '.', 1) and p.tem_foto and p.criado_em > now() - interval '15 minutes')
  );
drop policy if exists "administradores veem as fotos" on storage.objects;
create policy "administradores veem as fotos" on storage.objects for select to authenticated
  using (bucket_id = 'problemas' and public.eh_administrador());
drop policy if exists "administradores apagam as fotos" on storage.objects;
create policy "administradores apagam as fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'problemas' and public.eh_administrador());
