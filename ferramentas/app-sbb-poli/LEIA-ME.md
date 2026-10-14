# SBB Poli: a Área do aluno como app (iOS e Android)

**SBB = Sou Bixo Burro.** A ideia é transformar a Área do aluno (`aluno/`) num app de celular
chamado **SBB Poli**, para iPhone e Android.

Este arquivo é um caderno que cresce junto com o site. Cada página nova da Área do aluno acrescenta
aqui o que muda quando ela virar app. Quando chegar a hora de construir, é seguir as fases abaixo.

## O caminho recomendado

O site já é estático, com caminhos relativos e sem servidor. Por isso dá para reaproveitar quase
tudo, sem reescrever o app do zero.

**Fase 1, PWA (de graça, rápida).** O site vira "instalável": no Android aparece "Instalar app" e
no iPhone, "Adicionar à Tela de Início". O ícone e o nome SBB Poli vão para a tela do celular, sem
loja nenhuma.

- Criar `aluno/manifest.webmanifest` com `name: "SBB Poli"`, `start_url: "./"`, `scope: "./"`,
  `display: "standalone"`, cores do site e ícones de 192 e 512 px (e um "maskable").
- Criar um service worker que guarde as páginas e os arquivos da Área do aluno para abrir sem
  internet. O cardápio e as salas usam "rede primeiro, cópia se estiver sem sinal".
- No iPhone, a notificação de PWA só funciona com o app adicionado à Tela de Início (iOS 16.4 ou
  mais novo).

**Fase 2, app de verdade com Capacitor.** O Capacitor embrulha as mesmas páginas num app nativo e
dá acesso a recursos do celular: notificações, compartilhar e salvar arquivos.

- `npm i @capacitor/core @capacitor/cli`, depois `npx cap init "SBB Poli" br.com.gremiopolitecnico.sbbpoli`.
  O identificador é uma sugestão: depois de publicado, não muda mais.
- `webDir` aponta para uma pasta montada por script, com `aluno/`, `assets/` e o que a Área do aluno usa.
- `npx cap add android` e `npx cap add ios`. Para gerar o app de iPhone, é preciso um Mac com Xcode.

**Fase 3, lojas.**

- Google Play: conta de desenvolvedor com taxa única de US$ 25.
- App Store: Apple Developer Program a US$ 99 por ano. Vale a pena em nome do Grêmio (CNPJ), para
  o app não ficar preso à conta de uma pessoa.
- A Apple recusa app que é "só um site embrulhado" (diretriz 4.2, funcionalidade mínima). O SBB
  Poli precisa de coisas que só o app faz bem: notificações (cardápio, destaques, lotes de festa),
  funcionar sem internet, a grade salva no aparelho e compartilhar.

## O que o site já faz certo (e precisa continuar assim)

- Caminhos relativos em tudo. `site.js` calcula a raiz a partir de si mesmo, então funciona também
  dentro do app (`capacitor://localhost` ou `https://localhost`).
- Componentes pesados carregam sob demanda (`sobDemanda` em `site.js`).
- Dados em arquivos JSON (`assets/dados/`) e no Supabase, nunca escritos dentro do HTML.

## O que muda quando virar app

### Geral

- **Modo app:** o app marca `<html data-app>` e o CSS esconde o que é do site institucional, como a
  faixa "Novo site em construção", o menu do Grêmio e o rodapé institucional. O índice da Área do
  aluno vira uma barra de abas embaixo, por exemplo: Início, Bandejões, Salas, Meu Amor e SBB.
- **Dados sempre frescos:** `cardapio.json` e `salas.json` são gerados pelo agendamento do GitHub.
  No app, eles devem vir do site no ar, não da cópia empacotada, que envelhece. O GitHub Pages
  responde com `Access-Control-Allow-Origin: *`, então dá para buscar de dentro do app. Ideia: um
  campo `site.dadosAoVivo` no `config.js` com o endereço do site, usado só no modo app.
- **Links de fora** (JupiterWeb, USPolis, WhatsApp, Instagram, e-mail) abrem fora do app, com
  `@capacitor/browser` ou o app do próprio celular.
- **Fontes e bibliotecas de CDN** (Google Fonts, jsPDF do cdnjs): empacotar cópias locais, para
  funcionar sem internet.
- **Guardado no aparelho:** o `localStorage` funciona no app, mas o iOS pode apagá-lo quando falta
  espaço. O que não pode se perder vai para `@capacitor/preferences`.
- **Ícone e abertura:** partir da logo do Grêmio (`assets/img/marca/`), com o nome SBB Poli.
- **Notificações:** os destaques do carrossel (`assets/js/dados/destaques.js`) são o primeiro
  candidato a notificação. Para mandar, é preciso um backend que fale com o Firebase (Android) e com
  o APNs (iPhone). O Supabase já usado no site pode guardar os aparelhos inscritos.

### Página por página

- **Área do aluno (`aluno/`):** é a tela inicial do app. O carrossel de destaques entra no topo.
- **Bandejões:** o cardápio vem do site no ar (ver "Dados sempre frescos"). É um bom candidato a
  notificação: "o cardápio de hoje saiu". Hoje a página não usa a localização do celular. Se um dia
  usar, o app precisa pedir a permissão com uma explicação.
- **Salas e grade horária:**
  - A grade do aluno fica no `localStorage` e deve ir para `@capacitor/preferences`.
  - O app não baixa arquivos como o navegador. O PDF (jsPDF) e o `.ics` devem ser salvos com
    `@capacitor/filesystem` e entregues com `@capacitor/share`, para o aluno mandar para a agenda
    ou para o WhatsApp.
- **Meu Amor:** o envio de foto ao mural usa o FormSubmit com redirecionamento (`_next`). No app,
  trocar pelo envio por `fetch` ao endpoint `https://formsubmit.co/ajax/...`, sem sair da tela.
  Ainda melhor, a foto pode vir da câmera ou da galeria pelo `@capacitor/camera`.
- **Jornal:** "Baixar em PDF" usa `window.print()`, que não existe no app. Gerar o PDF ou abrir a
  versão de impressão no navegador.
- **Demandas e Extensões:** os links de e-mail (`mailto:`) abrem o app de e-mail do celular.
- **Extensões (`aluno/extensoes/`):** a lista dos grupos vem de `assets/js/dados/extensoes.js` (texto leve,
  entra no pacote). Os links de Instagram e LinkedIn abrem os apps; os selos com as iniciais viram as logos
  quando os grupos mandarem. As subpáginas de cada grupo (`aluno/extensoes/ID/`) ainda vão existir.
- **Circulares (`aluno/circulares/`):** trajetos, paradas e horários vêm do GTFS da SPTrans
  (`assets/dados/circulares.json`, uns 70 KB), bom para funcionar sem sinal. O mapa (Leaflet) precisa de
  internet para o fundo; a posição ao vivo depende da função `onibus` do Supabase.
- **Guia dos cursos (`aluno/cursos/`):** as logos dos CAs já são SVG leves e entram no pacote do app.
  As fotos das turmas pesam: o app deve baixá-las sob demanda e guardar só a do curso do aluno. Um
  bom recurso do app é o aluno escolher o seu curso na primeira abertura e o SBB Poli abrir direto no
  guia dele. Os @ do Instagram dos CAs abrem o app do Instagram.
- **Sou bixo burro (`aluno/bixo/`):**
  - O progresso do Manual do bixo fica no `localStorage` (`manual-bixo:vistos`) e deve ir para
    `@capacitor/preferences`.
  - As prévias do manual são iframes das próprias páginas. No app funcionam, mas pesam. Melhor
    trocar por "abrir a aba" correspondente na barra de baixo.
  - É a cara do app: vale abrir nele na primeira vez que o bixo usa o SBB Poli.
  - As mensagens pro bixo (`assets/js/dados/bixo-mensagens.js`: frases, fotos e vídeos) são uma boa
    tela de boas-vindas na primeira abertura do app. Vídeos do YouTube precisam de internet. Fotos e
    frases entram no cache para abrir sem sinal. Um `.mp4` dentro do app aumenta o download, então
    prefira o YouTube.
