// Grupos de extensão e coletivos da Poli (aluno/extensoes/), no mesmo espírito do Guia dos cursos.
// Fontes conferidas em outubro de 2026: grupos credenciados pela Poli (poli.usp.br/grupos-de-extensao),
// páginas de equipes e de coletivos do Departamento de Engenharia Mecânica (sites.usp.br/pme), o site
// de cada grupo, o Jornal da USP e a lista histórica do politecnicos.com.br. Só entram aqui links que
// estavam no ar ou que vieram de uma dessas fontes; os grupos sem confirmação recente ficam em
// `confirmando`, até o próprio grupo escrever para o Grêmio.
//
// Cada grupo vai ganhar uma subpágina (aluno/extensoes/ID/) escrita por ele. Para incluir um grupo:
//   { id: "sigla-curta", logo: "assets/img/extensoes/ID.jpg", nome: "Nome do grupo", texto: "uma ou duas frases", links: { site, instagram, youtube } }
//   (opcional: selo: "ABC", as letras do selo, quando as iniciais automáticas não ficarem boas)
// `instagram` é só o nome do perfil (sem o endereço inteiro).
// Logos: a foto de perfil do Instagram de cada grupo (100 × 100 px), salva em assets/img/extensoes/; o PET
// Mecatrônica e a Poli Cidadã vêm dos seus sites; a do NEP foi enviada à parte. Sem logo, o cartão mostra
// um selo com as iniciais.

export const areas = [
  { id: "competicao", titulo: "Equipes de competição", texto: "Carros, aviões, foguetes, satélites, robôs, drones e barcos, projetados e construídos pelos alunos." },
  { id: "tecnologia", titulo: "Tecnologia e estudo", texto: "Inteligência artificial, blockchain, saúde e os grupos PET." },
  { id: "mercado", titulo: "Mercado e empreendedorismo", texto: "Empresa júnior, ligas de finanças, negócios, consultoria e startups." },
  { id: "social", titulo: "Impacto social e educação", texto: "Engenharia para quem precisa, cursinho e expedições pelo Brasil." },
  { id: "cultura", titulo: "Cultura e internacional", texto: "Teatro e a porta da Poli para o mundo." },
  { id: "coletivos", titulo: "Coletivos", texto: "Acolhimento, representatividade e uma Poli para todo mundo." },
];

export const grupos = [
  // equipes de competição
  { id: "baja", area: "competicao", logo: "assets/img/extensoes/baja.jpg?v=061f5a40", nome: "Equipe Poli de Baja", texto: "Projeta, constrói e testa carros off-road para a competição Baja SAE. Fundada em 2001, é tricampeã nacional.",
    links: { site: "https://www.equipepoli.com.br/", instagram: "polibaja", youtube: "https://www.youtube.com/user/EquipePoli" } },
  { id: "poli-racing", area: "competicao", logo: "assets/img/extensoes/poli-racing.jpg?v=6ec88d3f", nome: "Equipe Poli Racing", texto: "Carros do tipo fórmula para a Fórmula SAE, do projeto à pista. Existe desde 2008.",
    links: { instagram: "equipepoliracing" } },
  { id: "keep-flying", area: "competicao", logo: "assets/img/extensoes/keep-flying.jpg?v=d3ac5562", nome: "Keep Flying", texto: "A equipe de aerodesign da Poli: aviões radiocontrolados para a SAE AeroDesign, desde 2003.",
    links: { instagram: "keepflyingpoliusp", youtube: "https://www.youtube.com/@polikf" } },
  { id: "jupiter", area: "competicao", logo: "assets/img/extensoes/jupiter.jpg?v=3a8cfe4b", nome: "Projeto Jupiter", texto: "Foguetes feitos pelos alunos. Em 2026 lançou o Elara II, com um motor híbrido desenvolvido pela equipe.",
    links: { site: "https://www.projetojupiter.com/", instagram: "projetojupiter" } },
  { id: "polisat", area: "competicao", logo: "assets/img/extensoes/polisat.jpg?v=323c2bfd", nome: "PoliSat", texto: "CubeSats e outras soluções espaciais: da concepção da missão à eletrônica embarcada. Criada em 2021.",
    links: { instagram: "polisat.usp" } },
  { id: "thunderatz", area: "competicao", logo: "assets/img/extensoes/thunderatz.jpg?v=9aa289d9", nome: "ThundeRatz", texto: "Robótica de competição desde 2001: robôs que enfrentam outros robôs em torneios no Brasil e fora dele.",
    links: { site: "https://thunderatz.org/", instagram: "thunderatz", youtube: "https://www.youtube.com/c/thunderatz" } },
  { id: "skyrats", area: "competicao", logo: "assets/img/extensoes/skyrats.jpg?v=86af2dae", nome: "Skyrats", texto: "Drones autônomos inteligentes para competições nacionais e internacionais, com uns 70 alunos de vários institutos da USP.",
    links: { site: "https://skyrats.com.br/", instagram: "skyrats_drones" } },
  { id: "polimilhagem", area: "competicao", logo: "assets/img/extensoes/polimilhagem.jpg?v=d21ee7dd", nome: "PoliMilhagem", texto: "Veículos elétricos de altíssima eficiência: ir o mais longe possível com o mínimo de energia.",
    links: { instagram: "polimilhagem" } },
  { id: "poli-nautico", area: "competicao", logo: "assets/img/extensoes/poli-nautico.jpg?v=85180757", nome: "Poli Náutico", texto: "Embarcações para competições universitárias: casco, propulsão, estabilidade e muito teste na água.",
    links: { instagram: "polinautico" } },

  // tecnologia e estudo
  { id: "turing", area: "tecnologia", logo: "assets/img/extensoes/turing.jpg?v=a399199d", nome: "Turing USP", texto: "Inteligência artificial e ciência de dados, com projetos que saem da universidade para hospitais, escolas e empresas.",
    links: { site: "https://www.turingusp.com/", instagram: "turing.usp" } },
  { id: "polichain", area: "tecnologia", logo: "assets/img/extensoes/polichain.jpg?v=ba1d152f", nome: "Polichain.xyz", selo: "PC", texto: "O grupo de estudos de blockchain da USP: hackathons, projetos internos e com parceiros.",
    links: { site: "https://polichain.xyz/", instagram: "polichain.xyz" } },
  { id: "zima", area: "tecnologia", logo: "assets/img/extensoes/zima.jpg?v=424acf53", nome: "ZIMA", texto: "Soluções médico-hospitalares para hospitais públicos, levando a eles a tecnologia dos grandes hospitais.",
    links: { site: "https://zimausp.org/", instagram: "zima.poliusp" } },
  { id: "pet-mecanica", area: "tecnologia", logo: "assets/img/extensoes/pet-mecanica.jpg?v=d376523d", nome: "PET Mecânica", texto: "Ensino, pesquisa e extensão juntos. Criado em 1991, foi um dos primeiros grupos PET da Poli.",
    links: { instagram: "pet_mecanica" } },
  { id: "pet-mecatronica", area: "tecnologia", logo: "assets/img/extensoes/pet-mecatronica.png?v=42b07532", nome: "PET Mecatrônica", texto: "O grupo PET da Mecatrônica: projetos, cursos e atividades para a graduação.",
    links: { site: "https://www.petmecatronica.poli.usp.br/" } },

  // mercado e empreendedorismo
  { id: "poli-junior", area: "mercado", logo: "assets/img/extensoes/poli-junior.jpg?v=0721883b", nome: "Poli Júnior", texto: "Fundada em 1989, é a primeira empresa júnior de engenharia do Brasil, toda gerida por alunos da Poli.",
    links: { site: "https://polijunior.com.br/", instagram: "polijuniorusp" } },
  { id: "poli-finance", area: "mercado", logo: "assets/img/extensoes/poli-finance.jpg?v=2d1614bf", nome: "Poli Finance", texto: "A liga de mercado financeiro da Poli: eventos com o mercado, treinamentos e competições. Desde 2012.",
    links: { site: "https://www.polifinance.com.br/", instagram: "poli_finance" } },
  { id: "poliquant", area: "mercado", logo: "assets/img/extensoes/poliquant.jpg?v=7aeac557", nome: "PoliQuant", texto: "Finanças quantitativas: matemática, estatística e algoritmos aplicados ao mercado. Criado em 2024.",
    links: { site: "https://poliquant.com.br/", instagram: "poli_quant" } },
  { id: "gnpoli", area: "mercado", logo: "assets/img/extensoes/gnpoli.jpg?v=fc857ed0", nome: "GNPoli", texto: "O Grupo de Negócios da Poli: mercado financeiro, consultoria estratégica e empreendedorismo, para complementar a engenharia.",
    links: { instagram: "gnpoliusp", youtube: "https://www.youtube.com/channel/UCnHv4_hkC_FGr6ni4CzOgcA" } },
  { id: "consulting-club", area: "mercado", logo: "assets/img/extensoes/consulting-club.jpg?v=46918d6b", nome: "Poli Consulting Club", texto: "Aproxima os alunos da consultoria: treinamentos, casos e preparação para os processos seletivos.",
    links: { site: "https://www.policonsultingclub.com.br/", instagram: "poli_consultingclub" } },
  { id: "lepoli", area: "mercado", logo: "assets/img/extensoes/lepoli.jpg?v=35713eab", nome: "LEPoli", texto: "A Liga de Empreendedorismo da Poli: eventos, conexões com startups e a aceleradora LEPoli Ventures.",
    links: { instagram: "lepoliusp", site: "https://www.poli.usp.br/noticias/grupos-de-extensao/liga-de-empreendedorismo-da-poli-lepoli/" } },

  // impacto social e educação
  { id: "poli-social", area: "social", logo: "assets/img/extensoes/poli-social.jpg?v=d4c49b3c", nome: "Poli Social", texto: "Consultoria gratuita para ONGs e eventos com impacto social, desde 2014.",
    links: { site: "https://www.grupopolisocial.com/", instagram: "grupopolisocial" } },
  { id: "nep", area: "social", logo: "assets/img/extensoes/nep.jpg?v=444ccaa9", nome: "NEP, Núcleo de Engenharia Popular", texto: "Engenharia feita por pessoas, para pessoas: projetos junto de quem vai usá-los, como um chatbot para UBS.",
    links: { site: "https://www.poli.usp.br/noticias/nep-nucleo-de-engenharia-popular/" } },
  { id: "cursinho", area: "social", logo: "assets/img/extensoes/cursinho.jpg?v=53f47cfe", nome: "Cursinho da Poli", texto: "Pré-vestibular criado em 1987 pela Escola e pelo Grêmio, para quem não pode pagar um cursinho.",
    links: { site: "https://cursinhodapoli.com.br/", instagram: "oficialcursinhodapoli" } },
  { id: "bandeira", area: "social", logo: "assets/img/extensoes/bandeira.jpg?v=1bca6bdc", nome: "Bandeira Científica", texto: "Expedições de saúde e engenharia pelo interior do Brasil, desde 1957.",
    links: { site: "https://www.bandeiracientifica.com.br/", instagram: "bandeiracientifica" } },
  { id: "poli-cidada", area: "social", logo: "assets/img/extensoes/poli-cidada.png?v=130d31b9", nome: "Poli Cidadã", texto: "O programa da Poli que estimula e apoia atividades de caráter social.",
    links: { site: "https://www.poli.usp.br/cultura-e-extensao/poli-cidada-home/" } },

  // cultura e internacional
  { id: "gtp", area: "cultura", logo: "assets/img/extensoes/gtp.jpg?v=81302fca", nome: "GTP, Grupo de Teatro da Poli", selo: "GTP", texto: "Teatro na Poli desde os anos 1940, ligado ao Grêmio. Aberto a toda a cidade, de graça.",
    links: { instagram: "grupoteatropoli" } },
  { id: "ipoli", area: "cultura", logo: "assets/img/extensoes/ipoli.jpg?v=19a19b5f", nome: "iPoli", texto: "O Escritório Politécnico Internacional: intercâmbio, duplo diploma e apoio a quem vem de fora.",
    links: { site: "https://www.ipoli.com.br/", instagram: "ipoliusp" } },

  // coletivos
  { id: "poli-negra", area: "coletivos", logo: "assets/img/extensoes/poli-negra.jpg?v=7e542b14", nome: "Poli Negra", texto: "Valorização, representatividade e permanência de estudantes negros na Poli.",
    links: { instagram: "coletivopolinegra" } },
  { id: "polipride", area: "coletivos", logo: "assets/img/extensoes/polipride.jpg?v=fb2d9159", nome: "PoliPride", texto: "Diversidade e inclusão de pessoas LGBTQIA+ na Poli, com eventos, campanhas e acolhimento.",
    links: { instagram: "coletivo.polipride" } },
  { id: "poligen", area: "coletivos", logo: "assets/img/extensoes/poligen.jpg?v=5524bac0", nome: "PoliGen", texto: "O Grupo de Estudos de Gênero da Poli: gênero na engenharia e na universidade, em estudos e debates.",
    links: { instagram: "a_poligen" } },
  { id: "politecnicas", area: "coletivos", logo: "assets/img/extensoes/politecnicas.jpg?v=0cb1a0fe", nome: "Politécnicas (R)existem", texto: "Pela presença das mulheres na engenharia: rodas de conversa, mentorias e ações na Poli.",
    links: { instagram: "politecnicas.r.existem" } },
];

// Grupos que já passaram pela Poli, mas sem confirmação recente de que continuam ativos.
export const confirmando = ["AcappoLLi", "Poli Dance", "ABU na Poli", "CORE Júnior (Poli Santos)", "USP Mining Team", "Matemática em Movimento", "Engenheiros Sem Fronteiras, Núcleo São Paulo", "Poli Mundi"];
