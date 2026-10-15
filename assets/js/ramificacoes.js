// Registro central das ramificações do site, em árvore.
// É a fonte única para o índice lateral, o menu, os blocos da página inicial,
// as páginas de cada ramificação e o mapa do rodapé.
//
// Cada nó:
//   id        identificador único (vira âncora e data-id da página)
//   titulo    nome exibido
//   caminho   pasta da página, relativa à raiz (ex.: "aluno/" ou "aluno/notas/").
//             Sem caminho, o nó é uma seção dentro da página do nó pai (link para pai#id).
//   resumo    uma ou duas frases sobre a ramificação
//   texto     descrição de uma seção (para nós sem página própria)
//   numeros   [{ valor, rotulo }]
//   acoes     [{ rotulo, href, externo }]
//   filhos    nós filhos, com o mesmo formato (qualquer profundidade)
//   construcao  true enquanto a página não tiver o conteúdo completo
//   chamada   texto do link no cartão da página (opcional; padrão "Abrir <título>")
//   estado    "no-ar" (já funciona) ou "em-construcao"; aparece como pílula nos cartões
//   destaque  frase curta em destaque no índice da área (ex.: um recado para um público)
//   veja      id de outro nó relacionado (ex.: um projeto que ganhou seção no portal); vira link "Ver também"
//
// Para criar páginas novas: adicione o nó com `caminho` e rode `node ferramentas/paginas.mjs`.
// Conteúdo das frentes: página "Projetos e impacto" do site atual, conferida em outubro de 2026.
// Apoio ao aluno, projetos culturais e projetos sociais dividem a página "Projetos e apoio"
// (projetos/): cada um é uma seção, e os projetos de cada um ficam dentro dela.

export const grupos = [
  { id: "frentes", titulo: "Frentes do Grêmio" },
  { id: "acessos", titulo: "Acessos" },
  { id: "mais", titulo: "Mais do Grêmio" },
];

// Nós com grupo "fim" não entram nas listas do índice: aparecem como botão no fim dele
// (hoje, a Transparência, em vermelho).

export const ramificacoes = [
  {
    id: "projetos",
    grupo: "frentes",
    titulo: "Projetos e apoio",
    caminho: "projetos/",
    construcao: true,
    resumo: "Apoio ao aluno, projetos culturais e projetos sociais: o que o Grêmio faz pela vida acadêmica, pela cultura e pela comunidade, dentro e fora da Poli.",
    numeros: [
      { valor: "700+", rotulo: "alunos por ano nas aulas de reforço" },
      { valor: "80+", rotulo: "anos de O Politécnico e do GTP" },
      { valor: "1000+", rotulo: "estudantes alcançados pelo Poli Vai à Escola" },
    ],
    filhos: [
      {
        id: "apoio",
        titulo: "Apoio ao aluno",
        resumo: "Do reforço antes da prova ao empréstimo de calculadora: ajuda prática para atravessar a graduação.",
        numeros: [
          { valor: "700+", rotulo: "alunos por ano nas aulas de reforço" },
          { valor: "900+", rotulo: "auxílios financeiros para idiomas concedidos" },
        ],
        filhos: [
          { id: "reforco", titulo: "Aulas de reforço (Fuja do Nabo)", texto: "Aulas na reta final antes das provas, gravadas e publicadas no YouTube do Grêmio.", veja: "fuja-do-nabo" },
          { id: "apoio-academico", titulo: "Apoio acadêmico", texto: "Dúvidas sobre matrícula, requerimentos e calendário, divulgação de bolsas e pedidos de reoferecimento de disciplinas." },
          { id: "emprestimo", titulo: "Empréstimo de material", texto: "Calculadoras científicas, jalecos e equipamentos de som e foto para eventos e apresentações." },
          { id: "bolsas", titulo: "Auxílio financeiro para idiomas", texto: "Auxílio financeiro para estudar idiomas no Poliglota Idiomas." },
        ],
      },
      {
        id: "cultura",
        titulo: "Projetos culturais",
        resumo: "Jornalismo, arte e teatro com décadas de história dentro da Poli.",
        numeros: [
          { valor: "80+", rotulo: "anos de O Politécnico e do GTP" },
          { valor: "1989", rotulo: "ano da primeira SAPO" },
        ],
        filhos: [
          { id: "o-politecnico", titulo: "Jornal O Politécnico", texto: "Desde 1944 tratando os temas da Poli com verdade, humor e curiosidade.", veja: "jornal" },
          { id: "sapo", titulo: "Semana de Arte da Poli (SAPO)", texto: "Desde 1989, oficinas de pintura, recitais de piano e apresentações de teatro e dança." },
          { id: "gtp", titulo: "Grupo de Teatro da Poli (GTP)", texto: "Mais de 80 anos de história e aulas gratuitas, abertas à universidade e ao público." },
        ],
      },
      {
        id: "social",
        titulo: "Projetos sociais",
        resumo: "A Poli indo até as escolas públicas e abrindo as portas para quem ainda vai chegar.",
        numeros: [
          { valor: "1000+", rotulo: "estudantes alcançados pelo Poli Vai à Escola" },
          { valor: "75", rotulo: "alunas visitantes no Meninas na Poli em 2025" },
        ],
        filhos: [
          { id: "poli-vai-a-escola", titulo: "Poli Vai à Escola", texto: "Politécnicos levam a universidade até escolas, desde 2023." },
          { id: "meninas-na-poli", titulo: "Meninas na Poli", texto: "Alunas do ensino médio de escolas públicas conhecem laboratórios, atividades estudantis e a rotina da Poli." },
          { id: "semana-da-mulher", titulo: "Semana da Mulher Politécnica", texto: "Programação dedicada às mulheres da Poli." },
        ],
      },
    ],
  },
  {
    id: "servicos",
    grupo: "frentes",
    titulo: "Serviços",
    caminho: "servicos/",
    resumo: "Serviços mantidos pelo Grêmio no campus para o dia a dia de quem estuda na Poli.",
    numeros: [
      { valor: "6", rotulo: "idiomas no Poliglota" },
      { valor: "30+", rotulo: "anos de Poliglota" },
    ],
    filhos: [
      { id: "copiadora", titulo: "Copiadora Politécnica", texto: "Plano de cotas com preços mais acessíveis durante toda a graduação, itens de conveniência e impressão de material de divulgação." },
      { id: "triedro", titulo: "Lanchonete Triedro", texto: "Refeições a preços acessíveis no prédio do Biênio." },
      { id: "poliglota", titulo: "Poliglota Idiomas", texto: "Há mais de 30 anos ensinando alemão, espanhol, francês, inglês, italiano e português." },
    ],
  },
  {
    id: "representacao",
    grupo: "frentes",
    titulo: "Representação discente",
    caminho: "representacao/",
    construcao: true,
    resumo: "Alunos com voz e voto nas decisões da graduação e da pós-graduação. Nessas instâncias, o voto discente tem o mesmo peso do voto docente.",
    acoes: [
      { rotulo: "Enviar uma demanda", href: "aluno/demandas/" },
      { rotulo: "Escrever por e-mail (provisório)", href: "mailto:chapa.poli.prisma@gmail.com", externo: true },
    ],
    filhos: [],
  },
  {
    id: "parcerias",
    grupo: "frentes",
    titulo: "Parcerias",
    caminho: "parcerias/",
    resumo: "Projetos com os grupos de extensão da Poli e parcerias com empresas, cada um com prazo, objetivo e atualizações.",
    filhos: [
      { id: "gex", titulo: "Com os grupos de extensão", texto: "O que o Grêmio busca construir com os GEX e os projetos já lançados." },
      { id: "empresas", titulo: "Com empresas", texto: "O que uma parceria pode apoiar e o compromisso com as contas abertas." },
    ],
  },
  {
    id: "aluno",
    grupo: "acessos",
    titulo: "Área do aluno",
    caminho: "aluno/",
    resumo: "O portal aberto do Novo Grêmio: o lugar para tirar suas dúvidas e encontrar tudo o que ajuda a viver a Poli, dos estudos ao amor pela Escola.",
    // Seções do portal aberto, na ordem do documento "A Nova Era do Grêmio Politécnico".
    filhos: [
      {
        id: "bandejoes",
        titulo: "Bandejões",
        caminho: "aluno/bandejoes/",
        estado: "no-ar",
        resumo: "Cardápio de hoje, horários, preço e o caminho a pé até cada um dos quatro bandejões do campus.",
        chamada: "Ver cardápio e caminho",
      },
      {
        id: "circulares",
        titulo: "Circulares da USP",
        caminho: "aluno/circulares/",
        estado: "no-ar",
        resumo: "Os ônibus que entram no campus: os circulares de graça com o BUSP, as paradas no mapa e onde cada ônibus está agora.",
        chamada: "Ver os circulares",
      },
      {
        id: "salas",
        titulo: "Salas e grade horária",
        caminho: "aluno/salas/",
        estado: "no-ar",
        resumo: "Onde é a sua aula e a sua grade com as salas, com os dados do USPolis. Em breve, as salas livres em cada prédio da Poli.",
        chamada: "Encontrar uma sala",
      },
      {
        id: "cursos",
        titulo: "Guia dos cursos",
        caminho: "aluno/cursos/",
        estado: "em-construcao",
        cartao: false,
        resumo: "Cada centro acadêmico apresenta o seu curso: as matérias do primeiro semestre, o centrinho e a turma do ano passado.",
        filhos: [
          { id: "curso-civil", titulo: "Engenharia Civil", caminho: "aluno/cursos/civil/" },
          { id: "curso-ambiental", titulo: "Engenharia Ambiental", caminho: "aluno/cursos/ambiental/" },
          { id: "curso-eletrica", titulo: "Engenharia Elétrica", caminho: "aluno/cursos/eletrica/" },
          { id: "curso-computacao", titulo: "Engenharia de Computação", caminho: "aluno/cursos/computacao/" },
          { id: "curso-mecanica", titulo: "Engenharia Mecânica", caminho: "aluno/cursos/mecanica/" },
          { id: "curso-mecatronica", titulo: "Engenharia Mecatrônica", caminho: "aluno/cursos/mecatronica/" },
          { id: "curso-naval", titulo: "Engenharia Naval", caminho: "aluno/cursos/naval/" },
          { id: "curso-producao", titulo: "Engenharia de Produção", caminho: "aluno/cursos/producao/" },
          { id: "curso-quimica", titulo: "Engenharia Química", caminho: "aluno/cursos/quimica/" },
          { id: "curso-materiais-metalurgica-nuclear", titulo: "Engenharia de Materiais, Metalúrgica e Nuclear", caminho: "aluno/cursos/materiais-metalurgica-nuclear/" },
          { id: "curso-minas-petroleo", titulo: "Engenharia de Minas e Petróleo", caminho: "aluno/cursos/minas-petroleo/" },
        ],
      },
      {
        id: "fuja-do-nabo",
        titulo: "Fuja do Nabo",
        caminho: "aluno/fuja-do-nabo/",
        estado: "em-construcao",
        resumo: "O hub de estudos da Poli: videoaulas, provas antigas resolvidas, exercícios para cada prova, os livros dos professores e um assistente com IA.",
        chamada: "Conhecer o hub de estudos",
      },
      {
        id: "minerva",
        titulo: "Minerva",
        caminho: "aluno/minerva/",
        estado: "em-construcao",
        resumo: "Os grandes anúncios do Grêmio: Aulas Magnas com grandes nomes do país, palestras com os grupos de extensão e inscrições.",
        chamada: "Ver as Aulas Magnas",
      },
      {
        id: "extensoes",
        titulo: "Extensões",
        caminho: "aluno/extensoes/",
        estado: "em-construcao",
        resumo: "Os grupos de extensão e coletivos da Poli, com o que cada um faz, a logo e onde encontrá-los.",
        chamada: "Conhecer o hub dos grupos",
      },
      {
        id: "tradicoes",
        titulo: "Tradições da Poli",
        caminho: "aluno/tradicoes/",
        estado: "no-ar",
        resumo: "BichUSP, InterUSP, IntegraPoli e a carta para os bixos: como as tradições eram e como vão voltar com a turma de 2027. Inspirado no Politécnicos.",
        chamada: "Conhecer as tradições",
        filhos: [
          { id: "tradicao-bichusp", titulo: "BichUSP", caminho: "aluno/tradicoes/bichusp/" },
          { id: "tradicao-interusp", titulo: "InterUSP", caminho: "aluno/tradicoes/interusp/" },
          { id: "tradicao-integrapoli", titulo: "IntegraPoli", caminho: "aluno/tradicoes/integrapoli/" },
          { id: "tradicao-bixos-e-bixetes", titulo: "Bixos e bixetes", caminho: "aluno/tradicoes/bixos-e-bixetes/" },
        ],
      },
      {
        id: "meu-amor",
        titulo: "Meu Amor",
        caminho: "aluno/meu-amor/",
        estado: "no-ar",
        resumo: "Festas, esportes, cultura e o mural de memórias: a parte da Poli que não cai em prova, como está hoje e como a gente quer que fique.",
        chamada: "Ver eventos, esportes e memórias",
        filhos: [
          { id: "festas-e-viagens", titulo: "Eventos", texto: "Semana de Recepção, festas e viagens (datas, lotes e contato para comprar) e a Feira de Extensão." },
          { id: "esportes", titulo: "Esportes", texto: "O espaço da AAAP: jogos da rodada, resultados do fim de semana e links para assistir." },
          { id: "exposicao-cultural", titulo: "Cultura", texto: "Exposição livre de arte: grupos de teatro, dança e música, e a arte de cada aluno." },
          { id: "mural", titulo: "Mural de memórias", texto: "Mais de um século de Poli em fotos, com as que os alunos mandam." },
          { id: "turmas", titulo: "Turmas de cada ano", texto: "A foto de cada turma de cada curso, guardada ano a ano." },
        ],
      },
      {
        id: "jornal",
        titulo: "Jornal O Politécnico",
        caminho: "aluno/jornal/",
        estado: "em-construcao",
        resumo: "O jornal dos politécnicos desde 1944 renasce no portal, com a cara das edições que circularam pela Poli e espaço para quem quer escrever.",
        chamada: "Ler a primeira página",
      },
      {
        id: "demandas",
        titulo: "Demandas",
        caminho: "aluno/demandas/",
        estado: "no-ar",
        resumo: "Leve uma proposta, demanda ou denúncia direto para a diretoria responsável do Grêmio.",
        chamada: "Enviar uma demanda",
      },
      {
        id: "bixo",
        titulo: "Sou bixo burro",
        caminho: "aluno/bixo/",
        estado: "em-construcao",
        botao: "bixo",
        resumo: "O cantinho do bixo: o Manual do bixo, pra não lesar na primeira semana, e as vantagens de quem acabou de chegar.",
        filhos: [
          { id: "manual", titulo: "Manual do bixo", texto: "Onde comer, onde é a sua aula, a Semana de Recepção, os grupos de extensão e como falar com o Grêmio." },
          { id: "beneficios", titulo: "Vantagens", texto: "As vantagens de ser bixo, pra quem entra em 2027." },
        ],
      },
    ],
  },
  {
    id: "politecnico",
    grupo: "acessos",
    titulo: "Área do politécnico",
    caminho: "politecnico/",
    resumo: "Politécnico uma vez, politécnico para sempre: a rede dos ex-alunos para reencontrar a turma, guardar as fotos e manter contato.",
    filhos: [
      { id: "turma", titulo: "Encontre a sua turma", texto: "Quem da sua turma já está na rede, por curso e ano de entrada." },
      { id: "entrar", titulo: "Entre para a rede", texto: "O seu perfil de politécnico, com o contato só para quem você deixar." },
      { id: "fotos", titulo: "Fotos da turma", texto: "As fotos da sua época, guardadas no arquivo das turmas." },
      { id: "vem-ai", titulo: "O que vem por aí", texto: "Mentoria, vagas, reencontros e apoio aos projetos de quem está estudando." },
    ],
  },
  {
    id: "admin",
    grupo: "acessos",
    titulo: "Área dos administradores",
    caminho: "admin/",
    resumo: "O portal interno do Grêmio: contas, projetos e parcerias lançados pela gestão e publicados na hora.",
    filhos: [
      { id: "contas", titulo: "Contas do Grêmio", texto: "Receitas, despesas, dívida e saldo inicial, publicados na Transparência." },
      { id: "projetos", titulo: "Projetos e parcerias", texto: "Projetos com GEX e empresas, com prazo e atualizações, publicados em Parcerias." },
      { id: "vendas", titulo: "Vendas da loja", texto: "Cada venda entra sozinha na Transparência, somada por dia e sem dados de quem comprou." },
    ],
  },
  {
    id: "loja",
    grupo: "mais",
    titulo: "Loja do Grêmio",
    caminho: "loja/",
    resumo: "Vista a camisa politécnica e faça a diferença. Os lucros da loja apoiam os projetos sociais do Grêmio.",
    filhos: [],
  },
  {
    id: "transparencia",
    grupo: "fim",
    titulo: "Transparência",
    caminho: "transparencia/",
    resumo: "Todas as receitas e despesas do Grêmio desde o começo de 2027, com o saldo atualizado na hora e a situação da dívida.",
  },
];

// ---------- utilidades da árvore ----------

// Percorre todos os nós, entregando cada um com a lista de ancestrais.
export function* percorrer(nos = ramificacoes, ancestrais = []) {
  for (const no of nos) {
    yield { no, ancestrais };
    if (no.filhos) yield* percorrer(no.filhos, [...ancestrais, no]);
  }
}

export const encontrar = (id) => {
  for (const item of percorrer()) if (item.no.id === id) return item;
  return null;
};

// Destino de um link para o nó: a página dele ou a âncora na página do ancestral mais próximo com página.
export function destino(no, ancestrais = encontrar(no.id)?.ancestrais || []) {
  if (no.caminho) return no.caminho;
  const pai = [...ancestrais].reverse().find((a) => a.caminho);
  return `${pai ? pai.caminho : ""}#${no.id}`;
}
