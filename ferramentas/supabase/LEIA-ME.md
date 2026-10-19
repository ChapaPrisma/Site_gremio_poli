# Banco das contas (Supabase)

A página **Transparência** e o painel de contas do **portal interno** usam um banco Supabase:
leitura pública, escrita só para administradores, atualização ao vivo. Plano gratuito basta.

## Configurar (uma vez, uns 10 minutos)

1. Crie uma conta em https://supabase.com e um projeto novo (região: São Paulo).
2. No projeto, abra **SQL Editor**, cole o conteúdo de `contas.sql` e rode.
3. Ainda no SQL Editor, cadastre quem pode lançar contas:
   `insert into public.administradores (email) values ('pessoa@exemplo.com');`
4. Em **Authentication > Users**, crie (ou convide) essas mesmas pessoas, com e-mail e senha.
5. Em **Authentication > Sign In / Providers > Email**, desligue **Allow new users to sign up**
   (só quem você criar consegue entrar).
6. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public** e cole em
   `assets/js/config.js`, em `site.contas` (`supabaseUrl` e `supabaseChave`). Essa chave é pública
   por desenho: quem protege a escrita são as regras do `contas.sql`.
7. Publique o site. Pronto: os administradores entram em **Área dos administradores > Contas do
   Grêmio**, lançam receitas e despesas, e a Transparência atualiza sozinha.

## Projetos e vendas da loja

Depois do `contas.sql`, rode no SQL Editor:

- `projetos.sql`: projetos com GEX e empresas, publicados na página Parcerias.
- `loja.sql`: vendas da loja. Cada venda registrada em `vendas` (pelo painel **Vendas da loja**
  do admin ou, no futuro, pelo checkout online) dispara um gatilho que soma as vendas do dia e
  publica uma receita "Vendas da loja" em `lancamentos`, que aparece na Transparência. A venda não
  guarda nada de quem comprou, e o público só vê o total do dia. Para ligar um checkout online,
  basta ele inserir cada pedido pago em `vendas` com `canal = 'online'`.

## Mapa de problemas

Rode `problemas.sql` no SQL Editor (depois do `contas.sql`). Ele cria a tabela `problemas` (o que os alunos
registram no mapa da página Demandas), os apoios ("eu também vi isso"), os limites contra enxurrada (6 registros
por hora por conexão e 400 por dia no total; a conexão é guardada só como um código embaralhado) e o bucket
privado `problemas`, com as fotos (até 1,5 MB, só imagem; o site já reduz cada foto para uns 200 KB). O público
vê natureza, texto, data, lugar, situação e apoios; as fotos e a lista completa ficam no painel **Mapa de
problemas** do portal interno, que também baixa tudo como planilha.

## Sem o banco

Enquanto `site.contas` estiver vazio, a Transparência lê `assets/dados/contas.json` (só leitura) e o
portal interno mostra este passo a passo.
