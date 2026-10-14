-- Área do politécnico (politecnico/): a rede de ex-alunos da Poli.
-- AINDA NÃO RODADO: enquanto o site é a proposta da chapa, os formulários mostram o aviso de proposta.
-- Quando for ligar de verdade, rode este arquivo no SQL Editor do Supabase (depois do contas.sql).
--
-- Cada politécnico entra com a própria conta (e-mail e senha, ou login Google) e cadastra o seu perfil.
-- Privacidade (LGPD): o perfil só aparece depois de a pessoa aceitar; nome, curso e anos aparecem para
-- quem visita, e o contato só para quem também está logado na rede, e só se a pessoa permitir.

create table if not exists public.politecnicos (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 2 and 120),
  curso text not null,                         -- id do curso, como em assets/js/dados/cursos.js
  ano_ingresso smallint check (ano_ingresso between 1894 and 2100),
  ano_formatura smallint check (ano_formatura between 1898 and 2100),
  cidade text,
  onde_trabalha text,
  sobre text check (char_length(sobre) <= 600),
  linkedin text,
  contato_visivel boolean not null default false,  -- mostrar e-mail/LinkedIn para outros politécnicos logados
  aceitou_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);
create index if not exists politecnicos_turma on public.politecnicos (curso, ano_ingresso);

-- Fotos da turma: o arquivo fica no Storage (pasta turmas/<curso>/<ano>/); aqui, a legenda e quem mandou.
create table if not exists public.fotos_turma (
  id uuid primary key default gen_random_uuid(),
  curso text not null,
  ano smallint not null,
  caminho text not null,                      -- caminho do arquivo no bucket "turmas"
  legenda text check (char_length(legenda) <= 200),
  enviado_por uuid references auth.users (id) on delete set null,
  aprovado boolean not null default false,    -- a gestão aprova antes de aparecer
  criado_em timestamptz not null default now()
);

alter table public.politecnicos enable row level security;
alter table public.fotos_turma enable row level security;

-- Perfis: qualquer um vê nome, curso e anos (pela view abaixo); cada um edita só o seu.
drop policy if exists "cada um cuida do seu perfil" on public.politecnicos;
create policy "cada um cuida do seu perfil" on public.politecnicos for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "politécnicos logados veem a rede" on public.politecnicos;
create policy "politécnicos logados veem a rede" on public.politecnicos for select to authenticated using (true);

-- Vitrine pública: sem contato nenhum.
create or replace view public.politecnicos_publico as
  select id, nome, curso, ano_ingresso, ano_formatura, cidade, onde_trabalha from public.politecnicos;
grant select on public.politecnicos_publico to anon, authenticated;

-- Fotos: todos veem as aprovadas; politécnicos logados mandam; a gestão aprova.
drop policy if exists "fotos aprovadas são públicas" on public.fotos_turma;
create policy "fotos aprovadas são públicas" on public.fotos_turma for select using (aprovado);
drop policy if exists "politécnicos mandam fotos" on public.fotos_turma;
create policy "politécnicos mandam fotos" on public.fotos_turma for insert to authenticated
  with check (enviado_por = auth.uid() and not aprovado);
drop policy if exists "gestão aprova fotos" on public.fotos_turma;
create policy "gestão aprova fotos" on public.fotos_turma for all to authenticated
  using (public.eh_administrador()) with check (public.eh_administrador());
