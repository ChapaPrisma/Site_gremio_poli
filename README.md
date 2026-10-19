# Site do Grêmio Politécnico da USP

Site estático, modular e independente de hospedagem. Não tem etapa de build: o que está no repositório é exatamente o que vai ao ar.

Hoje ele está no GitHub Pages, em https://chapaprisma.github.io/Site_gremio_poli/ (repositório `ChapaPrisma/Site_gremio_poli`). Como todos os caminhos são relativos, trocar de endereço não exige mudar o código; só a configuração de login do Supabase (Authentication > URL Configuration) precisa do endereço novo.

## Rodar localmente

Como o site usa módulos JavaScript, abra-o por um servidor local, não clicando duas vezes no arquivo:

```sh
python -m http.server 8000
# ou: npx serve .
```

Depois acesse http://localhost:8000.

## Estrutura

```
index.html                 página inicial
projetos/, eventos/, …     uma pasta por ramificação, gerada por ferramentas/paginas.mjs
aluno/                     Área do aluno: o portal aberto do Novo Grêmio (páginas escritas à mão)
  fuja-do-nabo/            hub de estudos
  extensoes/               hub dos grupos de extensão
  meu-amor/                eventos, esportes, cultura e o mural de memórias
  jornal/                  Jornal O Politécnico (estética de papel-jornal, assets/css/jornal.css)
  minerva/                 grandes anúncios e Aulas Magnas
  bandejoes/               guia dos bandejões: cardápio do dia, mapa e caminho a pé
  salas/                   salas livres, onde é a minha aula e minha grade (dados do USPolis)
  demandas/                demandas para a diretoria (monta um e-mail)
  cursos/                  Guia dos cursos, escrito pelos centros acadêmicos (uma pasta por curso)
  bixo/                    Sou bixo burro: Manual do bixo e vantagens de quem acabou de entrar
admin/                     Área dos administradores: o portal interno
loja/                      Loja do Grêmio (em breve)
transparencia/             receitas, despesas, saldo e dívida do Grêmio (lançados no portal interno)
.github/workflows/         agendador do cardápio (opcional; ver "Cardápio dos bandejões")
.nojekyll                  faz o GitHub Pages servir os arquivos como estão
assets/
  css/
    tokens.css             cores, fontes e medidas (identidade visual)
    base.css               reset, tipografia e utilitários
    componentes.css        botões, chips, cabeçalho, índice, seções, cartões, rodapé
    bandejoes.css          estilos só do guia dos bandejões
    portal.css             peças das páginas do portal (abertura, módulos, chamado, calendário, formulário)
    jornal.css             estilos só do Jornal O Politécnico
  dados/
    cardapio.json          cardápio da semana, gerado por ferramentas/cardapio.mjs
    salas.json             salas e ocupações dos próximos 14 dias, gerado por ferramentas/salas.mjs
  js/
    config.js              menu, contato, redes e autoria
    ramificacoes.js        registro das ramificações em árvore (fonte única de índice, páginas, menu e mapa)
    site.js                monta os componentes de cada página
    componentes/           um arquivo por componente (cabecalho, rodape, indice, trilha, pagina, recursos, ramificacoes, agora, guia-bandejoes)
    dados/                 dados reutilizáveis (bandejões e horários, mapa do campus)
  img/
    marca/                 logo oficial do Grêmio (não alterar)
    servicos/, historia/   imagens de conteúdo
```

## O portal do Novo Grêmio

O site segue o documento "A Nova Era do Grêmio Politécnico": um portal aberto (Área do aluno) e um portal interno (Área dos administradores), com meta de lançamento na Semana de Recepção de 2027 (`site.portal` em `config.js`). Cada seção do portal é um filho do nó `aluno` no registro, com `estado: "no-ar"` ou `"em-construcao"`, que vira pílula nos cartões. Itens antigos que ganharam seção no portal apontam para ela com `veja` (ex.: Aulas de reforço → Fuja do Nabo).

Regras de conteúdo: o que é plano aparece como plano, com estado visível; nada de funcionalidade de mentira; onde dá para agir hoje, a página oferece uma ação real (e-mail com assunto pronto, YouTube, Bandejões).

## Destaques da Área do aluno

O carrossel no topo de `aluno/` mostra eventos principais, avisos e notícias do momento. Cada peça é só uma imagem, com o texto desenhado nela. Para pôr um destaque no ar, salve a imagem (1600 × 900 px) em `assets/img/destaques/` e acrescente um item em `assets/js/dados/destaques.js`, com o texto da imagem em `alt`, o `link` (opcional) e a data `ate` (opcional, o destaque some sozinho depois dela). O próprio arquivo explica cada campo, inclusive a versão para celular (`imagemCelular`, 1080 × 1350 px).

## Guia dos cursos e fotos das turmas

Tudo vem de `assets/js/dados/cursos.js`: os centros acadêmicos (logo em `assets/img/cas/`, Instagram, centrinho) e os cursos (matérias do primeiro semestre, recado do CA e fotos das turmas). O próprio arquivo explica como cada CA preenche o seu guia. A foto da turma vai em `assets/img/turmas/ANO/CURSO.jpg`: a mais recente abre a página do curso e todas ficam guardadas, por ano e por centro acadêmico, em Meu Amor (`aluno/meu-amor/#turmas`). Nunca apague uma foto antiga.

## App SBB Poli

A Área do aluno vai virar um app de iOS e Android chamado **SBB Poli** (Sou Bixo Burro). O caminho e o que muda em cada página estão em [`ferramentas/app-sbb-poli/LEIA-ME.md`](ferramentas/app-sbb-poli/LEIA-ME.md). Ao criar ou mudar uma página da Área do aluno, acrescente lá o que ela precisa no app.

## Identidade visual

Títulos e números em Bricolage Grotesque, texto em Nunito. Bordas de 2px na cor tinta, cantos de 10px, botões e chips em pílula, números em "fichas" com borda. O azul da logo marca ações e links; o amarelo (`--sol`) é o sol do horizonte e o destaque. Esses elementos vieram do protótipo do guia dos bandejões e valem para o site inteiro.

## Cardápio dos bandejões

O guia em `aluno/bandejoes/` mostra o cardápio do dia lido de `assets/dados/cardapio.json`. Esse arquivo é gerado por:

```sh
node ferramentas/cardapio.mjs
```

O script consulta o serviço que alimenta o app Cardápio+ da USP. O serviço não aceita chamadas direto do navegador (não envia cabeçalhos CORS), por isso o cardápio passa pelo arquivo. Hoje o agendamento em `.github/workflows/cardapio.yml` roda o script quatro vezes por dia e publica o arquivo quando o cardápio muda. Em outra hospedagem, basta um cron rodando o mesmo comando e publicando o arquivo.

Como esse agendador faz commits no `main`, rode `git pull --rebase` antes de enviar as suas mudanças.

## Transparência e contas

A página `transparencia/` (botão vermelho no fim do índice) mostra o saldo do Grêmio desde 1º de janeiro de 2027, a barra da dívida, o gráfico mês a mês e o extrato completo, com download em CSV. Os lançamentos são feitos pelos administradores em `admin/` (Contas do Grêmio) e aparecem na Transparência ao vivo.

As contas ficam num banco Supabase (leitura pública, escrita só para a lista de administradores). Passo a passo em `ferramentas/supabase/LEIA-ME.md`, tabelas e regras em `ferramentas/supabase/contas.sql`, e a ligação em `site.contas` no `config.js`. Enquanto o banco não estiver ligado, a Transparência lê `assets/dados/contas.json`.

As vendas da loja entram sozinhas na Transparência: o painel **Vendas da loja** (em `admin/`) grava cada venda na tabela `vendas`, e um gatilho do banco (`ferramentas/supabase/loja.sql`) publica o total de cada dia como uma receita, sem nenhum dado de quem comprou. O futuro checkout online só precisa gravar os pedidos pagos na mesma tabela.

## Salas da Poli

A página `aluno/salas/` lê `assets/dados/salas.json`, gerado por `node ferramentas/salas.mjs` a partir do USPolis (sistema de alocação de salas da Poli). Como o USPolis não aceita chamadas diretas do navegador, o padrão é o mesmo do cardápio: o agendamento em `.github/workflows/salas.yml` roda o script de hora em hora, das 6h às 23h. **Cache de 1 hora, vital para não sobrecarregar o USPolis:** o script consulta o USPolis no máximo uma vez por hora, onde quer que rode (trava em `ferramentas/.cache/`, guardada entre as execuções do GitHub pelo `actions/cache`); os visitantes nunca chamam o USPolis, e o navegador ainda guarda o arquivo por 1 hora. Todo o crédito dos dados é do USPolis, e a página diz isso. De reuniões e eventos o arquivo guarda só o tipo, sem título nem quem reservou. A grade montada pelo aluno fica apenas no navegador dele.

## Fichas das disciplinas (JupiterWeb)

As matérias do primeiro semestre no Guia dos cursos, os créditos e a ementa na busca de Salas e a busca "Antes de começar uma disciplina" do Fuja do Nabo leem `assets/dados/disciplinas.json` (índice leve: o 1º semestre de cada curso e o nome e os créditos de cada sigla) e, só quando alguém abre a ficha, `assets/dados/disciplinas/<SIGLA>.json`. Os dois são gerados por `node ferramentas/jupiter.mjs`, agendado em `.github/workflows/jupiter.yml` (uma vez por dia, no máximo 50 fichas por vez, uma requisição por vez; cada ficha vale por um semestre e as grades dos cursos são conferidas uma vez por mês; sem nada pendente, a execução não chama o JupiterWeb). Nenhuma chamada ao JupiterWeb sai do navegador.

**Crédito:** o caminho até esses dados foi mapeado pelo [usp-mcp](https://github.com/CaioCastro1/mcp-usp), de Caio Castro e João Pedro Gunthen (licença MIT): foram eles que descobriram a interface pública e sem login do JupiterWeb (o `ControlePublicoDWR`) e documentaram as chamadas. O leitor de respostas de `ferramentas/jupiter.mjs` é uma tradução do `usp_mcp/jupiter/dwr.py` deles. O site cita os dois em cada lugar em que essas fichas aparecem.

## Turmas e montador de grade (JupiterWeb)

O montador de grade, a conferência do 1º ano e "Minha grade" em `aluno/salas/` leem `assets/dados/turmas.json`: as turmas do semestre de todas as disciplinas da Poli, das grades dos cursos e do USPolis, com horários, professores, turmas práticas vinculadas e vagas. É gerado por `node ferramentas/turmas.mjs`, agendado em `.github/workflows/turmas.yml` (uma vez por dia, no máximo 220 disciplinas por vez, uma página por vez com pausa; cada disciplina vale 3 dias). A conferência do 1º ano usa a grade de cada curso por semestre, que `ferramentas/jupiter.mjs` guarda em `disciplinas.json` (campo `grade`). A lógica das combinações fica em `assets/js/componentes/montador-grade.js` (testável no Node). O montador puxa as obrigatórias do semestre ideal escolhido, considera só as turmas com vaga para a Poli (e para o curso do aluno, pelos grupos de vagas do JupiterWeb), junta como uma grade só as turmas que têm o mesmo horário e aceita horários reservados (optativa de fora da lista, estágio), que entram na grade com a chave `#nome|dia|início|fim`. A grade compartilhada vai no próprio link (`?grade=SIGLA~TURMA.SIGLA~TURMA`), sem servidor.

**Crédito:** a ideia do montador e o caminho até as turmas (a página pública `obterTurma` do JupiterWeb) vêm do [MatrUSP](https://github.com/matrusp/matrusp), dos alunos do BCC do IME-USP, inspirado no MatrUFSC e no CAPIM de Ramiro Polla. Nenhum código do MatrUSP foi copiado: a licença dele (a do CAPIM) proíbe retorno financeiro em sites relacionados, e este site tem a Loja. Os nomes de quem fez o MatrUSP estão em Colaboradores.

## "Onde fica cada engenharia" (Guia dos cursos)

O desenho no fim de `aluno/cursos/` lê `assets/dados/campus-poli.json`, gerado por `python ferramentas/campus_poli.py` a partir do OpenStreetMap: os prédios num raio de 1,1 km do Biênio, as vias por onde se anda, o relevo (SRTM da NASA, pelo Open Topo Data) e o "campo de caminhada" (o tempo a pé do Biênio até cada ponto, com a velocidade de cada trecho pela função de Tobler, que desacelera nas subidas; o botão "Ver em minutos a pé" usa esse campo para redesenhar o campus). Nomes e endereços dos prédios ficam em `assets/js/dados/predios-poli.js`. Rode de novo se o OpenStreetMap ganhar prédios ou caminhos novos.

## Mapa de problemas (Demandas)

A página `aluno/demandas/#mapa` tem um mapa do campus (os mesmos prédios e caminhos de `campus-poli.json`) com os problemas que os alunos registram, no estilo do Waze: natureza (10 categorias com ícone, em `assets/js/dados/problemas.js`), foto, texto curto e lugar. O lugar é a localização do celular na hora do envio; sem ela, a gravada na foto; sem as duas, o aluno marca no mapa. Antes de enviar, o mapa mostra o que já foi registrado a menos de 30 m, para apoiar em vez de repetir. Os registros ficam no Supabase (`ferramentas/supabase/problemas.sql`): o público vê natureza, texto, data, situação e apoios; as fotos (bucket privado) e o texto completo ficam no painel do portal interno (`componentes/problemas-admin.js`), que muda a situação, responde e exporta CSV. Enquanto a chapa não for eleita, o envio e o "eu também vi isso" mostram o aviso de proposta, como os outros envios do site.

## Circulares da USP

A página `aluno/circulares/` mostra as linhas que entram na Cidade Universitária num mapa (Leaflet + OpenStreetMap), com cartões por linha (informações em `assets/js/dados/circulares.js`). O traçado, as paradas e os horários vêm de `assets/dados/circulares.json`, gerado por `python ferramentas/circulares_gtfs.py` a partir do GTFS oficial da SPTrans (espelhado sem cadastro pelo Mobility Database). Revise a cada semestre: rode o script e confira os textos dos cartões.

A posição ao vivo dos ônibus vem da função `onibus` do Supabase (`ferramentas/supabase/funcoes/onibus/index.ts`), que consulta a API Olho Vivo da SPTrans com a chave guardada no segredo `SPTRANS_TOKEN`. Sem a função, sem a chave ou com a SPTrans fora do ar, a página avisa que a localização ao vivo não está funcionando e segue mostrando mapa e linhas.

## Área do politécnico

A página `politecnico/` é a rede dos ex-alunos (terceira área de acesso, ao lado da do aluno e da dos administradores): encontrar a turma por curso e ano de entrada, entrar para a rede, mandar fotos da turma e as ideias que vêm por aí (mentoria, vagas, reencontros). A busca lê a vitrine pública `politecnicos_publico` do Supabase; as tabelas e as regras de privacidade estão em `ferramentas/supabase/politecnico.sql`, que só deve ser rodado quando a rede for ligada de verdade. Até lá, a busca mostra a turma vazia e os formulários passam pelo aviso de proposta.

## Identidade de campanha (temporária)

Desde 19/10/2026, por determinação da Comissão Eleitoral, este é um site de campanha da chapa Prisma: sem a logo, as cores ou os dados oficiais do Grêmio. Tudo o que entrar no site precisa poder voltar à identidade do Grêmio quando a chapa for eleita. Por isso:

- cores só pelas variáveis de `assets/css/tokens.css` (nunca hex fixo); para voltar, basta restaurar os valores antigos (azul #222e84);
- nome e marca pelo `assets/js/config.js` (`site.nome`, `site.descricao`) e pelo cabeçalho e rodapé (`componentes/cabecalho.js`, `componentes/rodape.js`);
- imagens com cor ou texto embutidos (banners de `assets/img/destaques/`, logos de serviços) precisam ser refeitas na volta; a logo do Grêmio, o `favicon.png`, a logo da Copiadora e as capas antigas d'O Politécnico estão no histórico do git (commits "Identidade da chapa Prisma" e "Campanha: banners...").

## Ao transferir o site para o Grêmio

Quando o site deixar de ser de uma pessoa e passar a ser do Grêmio, transfira também os serviços ligados a ele:

1. **Repositório**: transfira o repositório no GitHub para uma conta ou organização do Grêmio (Settings > Danger Zone > Transfer). Os agendamentos de cardápio e salas vão junto.
2. **Supabase (contas da Transparência)**: convide uma conta do Grêmio para o projeto (Organization > Members, como Owner) ou transfira o projeto para uma organização do Grêmio. Atualize a lista `administradores` com os e-mails da nova gestão e confira em Authentication > URL Configuration o Site URL e os Redirect URLs, se o endereço do site mudar.
3. **FormSubmit (fotos do mural)**: hoje os envios vão para o e-mail pessoal do administrador do site. Troque pelo e-mail do Grêmio no action do formulário de `aluno/meu-amor/` e confirme o novo e-mail no primeiro envio.
4. **Domínio próprio**: se entrar um domínio, atualize o Site URL no Supabase e o endereço de retorno do formulário (é calculado sozinho pela página).

## Versão dos arquivos (cache)

As referências a `.css` e `.js` levam `?v=AAAAMMDDHHMM`. Isso impede que o navegador misture arquivos novos com versões antigas em cache depois de uma publicação. As imagens (`.svg`, `.png`, `.jpg`, `.webp`) levam `?v=` com um código tirado do conteúdo do arquivo: uma imagem trocada com o mesmo nome aparece na hora, e as que não mudaram continuam em cache. O script `ferramentas/versionar.mjs` atualiza todas as versões de uma vez e roda sozinho antes de cada commit, se o gancho estiver instalado:

```sh
printf '#!/bin/sh\nnode ferramentas/versionar.mjs && git add -u\n' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Ao criar arquivos novos, escreva as referências normalmente (`"./componentes/novo.js"`); o script acrescenta a versão.

## Regras para manter o site portável

- Use sempre caminhos relativos, nunca começando com `/`. O site precisa funcionar em subpasta (`usuario.github.io/Site_gremio_poli/`) e na raiz de um domínio próprio.
- Dentro dos componentes, monte os links com `url("caminho")`. A função calcula a raiz do site a partir de `site.js`.
- Não use Jekyll, Liquid ou qualquer recurso exclusivo do GitHub.

## Como expandir

**Nova seção na página inicial:** copie um bloco `<section class="bloco">` do `index.html` e troque o conteúdo. Para fundo alternado, adicione a classe `bloco--painel`. Se a seção precisar aparecer no menu, inclua o item em `assets/js/config.js`.

**Ramificações e subdivisões:** o site é uma árvore cadastrada em `assets/js/ramificacoes.js`. Cada nó tem `id`, `titulo`, `resumo` e, opcionalmente, `caminho` (pasta da página), `numeros`, `acoes` e `filhos`, que seguem o mesmo formato e podem ter qualquer profundidade. Nó sem `caminho` vira uma seção dentro da página do pai, com link `pai/#id`.

Do registro saem o índice lateral (fixo nas páginas internas e na gaveta do botão "Índice"), a trilha de navegação, os blocos da página inicial, o mapa do rodapé e o conteúdo das páginas.

Para criar uma subdivisão nova (ex.: uma página dentro da Área do aluno):

1. adicione o nó em `filhos` do nó pai, com `caminho: "aluno/nome/"`;
2. rode `node ferramentas/paginas.mjs`, que cria a pasta e o `index.html` de toda página nova do registro, sem tocar nas que já existem;
3. publique. O índice, a trilha e os links se atualizam sozinhos.

**Áreas com índice próprio (Área do aluno, dos administradores):** as páginas dessas áreas usam `<div data-componente="indice" data-modo="lateral" data-raiz="aluno">`, que mostra só a área, com a página de entrada no topo e as subpáginas abaixo. O `paginas.mjs` já gera as subpáginas assim. Para listar as subpáginas como cartões numa página escrita à mão, use `<div data-componente="recursos" data-id="aluno"></div>`.

Para escrever o conteúdo de uma página à mão, edite o `index.html` dela e troque o `<div data-componente="pagina">` pelo HTML desejado, mantendo `<div data-componente="trilha" data-id="...">`.

**Novo componente:** crie `assets/js/componentes/nome.js` exportando `function (alvo, { site, url })`, registre o componente em `site.js` e use `<div data-componente="nome"></div>` na página. Componentes pesados, usados numa página só (como o guia dos bandejões), entram em `sobDemanda` no `site.js` e só são baixados nessa página.

**Abrir o índice de qualquer lugar:** qualquer botão com `data-abrir-gaveta` abre a gaveta do índice do site.
