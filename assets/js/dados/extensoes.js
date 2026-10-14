// Grupos de extensão e coletivos da Poli (aluno/extensoes/), no mesmo espírito do Guia dos cursos.
// Fontes conferidas em outubro de 2026: grupos credenciados pela Poli (poli.usp.br/grupos-de-extensao),
// páginas de equipes e de coletivos do Departamento de Engenharia Mecânica (sites.usp.br/pme), o site
// de cada grupo, o Jornal da USP e a lista histórica do politecnicos.com.br. Só entram aqui links que
// estavam no ar ou que vieram de uma dessas fontes; os grupos sem confirmação recente ficam em
// `confirmando`, até o próprio grupo escrever para o Grêmio.
//
// Cada grupo vai ganhar uma subpágina (aluno/extensoes/ID/) escrita por ele. Para incluir um grupo:
//   { id: "sigla-curta", nome: "Nome do grupo", texto: "uma ou duas frases", links: { site, instagram, linkedin, youtube } }
//   (opcional: selo: "ABC", as letras do selo, quando as iniciais automáticas não ficarem boas)
// `instagram` e `linkedin` são só o nome do perfil (sem o endereço inteiro).

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
  { id: "baja", area: "competicao", nome: "Equipe Poli de Baja", texto: "Projeta, constrói e testa carros off-road para a competição Baja SAE. Fundada em 2001, é tricampeã nacional.",
    links: { site: "https://www.equipepoli.com.br/", instagram: "polibaja", linkedin: "poli-baja", youtube: "https://www.youtube.com/user/EquipePoli" } },
  { id: "poli-racing", area: "competicao", nome: "Equipe Poli Racing", texto: "Carros do tipo fórmula para a Fórmula SAE, do projeto à pista. Existe desde 2008.",
    links: { instagram: "equipepoliracing", linkedin: "equipe-poli-racing-de-f%C3%B3rmula-sae" } },
  { id: "keep-flying", area: "competicao", nome: "Keep Flying", texto: "A equipe de aerodesign da Poli: aviões radiocontrolados para a SAE AeroDesign, desde 2003.",
    links: { instagram: "keepflyingpoliusp", linkedin: "keep-flying", youtube: "https://www.youtube.com/@polikf" } },
  { id: "jupiter", area: "competicao", nome: "Projeto Jupiter", texto: "Foguetes feitos pelos alunos. Em 2026 lançou o Elara II, com um motor híbrido desenvolvido pela equipe.",
    links: { site: "https://www.projetojupiter.com/", instagram: "projetojupiter", linkedin: "projetojupiter" } },
  { id: "polisat", area: "competicao", nome: "PoliSat", texto: "CubeSats e outras soluções espaciais: da concepção da missão à eletrônica embarcada. Criada em 2021.",
    links: { instagram: "polisat.usp", linkedin: "polisat-usp" } },
  { id: "thunderatz", area: "competicao", nome: "ThundeRatz", texto: "Robótica de competição desde 2001: robôs que enfrentam outros robôs em torneios no Brasil e fora dele.",
    links: { site: "https://thunderatz.org/", instagram: "thunderatz", linkedin: "thunderatz-equipe-de-rob-tica", youtube: "https://www.youtube.com/c/thunderatz" } },
  { id: "skyrats", area: "competicao", nome: "Skyrats", texto: "Drones autônomos inteligentes para competições nacionais e internacionais, com uns 70 alunos de vários institutos da USP.",
    links: { site: "https://skyrats.com.br/", instagram: "skyrats_drones", linkedin: "skyrats" } },
  { id: "polimilhagem", area: "competicao", nome: "PoliMilhagem", texto: "Veículos elétricos de altíssima eficiência: ir o mais longe possível com o mínimo de energia.",
    links: { instagram: "polimilhagem", linkedin: "polimilhagem" } },
  { id: "poli-nautico", area: "competicao", nome: "Poli Náutico", texto: "Embarcações para competições universitárias: casco, propulsão, estabilidade e muito teste na água.",
    links: { instagram: "polinautico" } },

  // tecnologia e estudo
  { id: "turing", area: "tecnologia", nome: "Turing USP", texto: "Inteligência artificial e ciência de dados, com projetos que saem da universidade para hospitais, escolas e empresas.",
    links: { site: "https://www.turingusp.com/", instagram: "turing.usp", linkedin: "turing-usp" } },
  { id: "polichain", area: "tecnologia", nome: "Polichain.xyz", selo: "PC", texto: "O grupo de estudos de blockchain da USP: hackathons, projetos internos e com parceiros.",
    links: { site: "https://polichain.xyz/", instagram: "polichain.xyz", linkedin: "polichainxyz" } },
  { id: "zima", area: "tecnologia", nome: "ZIMA", texto: "Soluções médico-hospitalares para hospitais públicos, levando a eles a tecnologia dos grandes hospitais.",
    links: { site: "https://zimausp.org/", instagram: "zima.poliusp", linkedin: "zimapoliusp" } },
  { id: "pet-mecanica", area: "tecnologia", nome: "PET Mecânica", texto: "Ensino, pesquisa e extensão juntos. Criado em 1991, foi um dos primeiros grupos PET da Poli.",
    links: { instagram: "pet_mecanica", linkedin: "petmecanica" } },
  { id: "pet-mecatronica", area: "tecnologia", nome: "PET Mecatrônica", texto: "O grupo PET da Mecatrônica: projetos, cursos e atividades para a graduação.",
    links: { site: "http://sites.poli.usp.br/pmr/pet/" } },

  // mercado e empreendedorismo
  { id: "poli-junior", area: "mercado", nome: "Poli Júnior", texto: "Fundada em 1989, é a primeira empresa júnior de engenharia do Brasil, toda gerida por alunos da Poli.",
    links: { site: "https://polijunior.com.br/", instagram: "polijuniorusp", linkedin: "poli-junior" } },
  { id: "poli-finance", area: "mercado", nome: "Poli Finance", texto: "A liga de mercado financeiro da Poli: eventos com o mercado, treinamentos e competições. Desde 2012.",
    links: { site: "https://www.polifinance.com.br/", instagram: "poli_finance", linkedin: "poli-finance" } },
  { id: "poliquant", area: "mercado", nome: "PoliQuant", texto: "Finanças quantitativas: matemática, estatística e algoritmos aplicados ao mercado. Criado em 2024.",
    links: { site: "https://poliquant.com.br/", instagram: "poli_quant", linkedin: "poli-quant" } },
  { id: "gnpoli", area: "mercado", nome: "GNPoli", texto: "O Grupo de Negócios da Poli: mercado financeiro, consultoria estratégica e empreendedorismo, para complementar a engenharia.",
    links: { instagram: "gnpoliusp", linkedin: "gnpoliusp", youtube: "https://www.youtube.com/channel/UCnHv4_hkC_FGr6ni4CzOgcA" } },
  { id: "consulting-club", area: "mercado", nome: "Poli Consulting Club", texto: "Aproxima os alunos da consultoria: treinamentos, casos e preparação para os processos seletivos.",
    links: { site: "https://www.policonsultingclub.com.br/", instagram: "poli_consultingclub", linkedin: "policonsultingclub" } },
  { id: "lepoli", area: "mercado", nome: "LEPoli", texto: "A Liga de Empreendedorismo da Poli: eventos, conexões com startups e a aceleradora LEPoli Ventures.",
    links: { instagram: "lepoliusp", site: "https://www.poli.usp.br/noticias/grupos-de-extensao/liga-de-empreendedorismo-da-poli-lepoli/" } },

  // impacto social e educação
  { id: "poli-social", area: "social", nome: "Poli Social", texto: "Consultoria gratuita para ONGs e eventos com impacto social, desde 2014.",
    links: { site: "https://www.grupopolisocial.com/", instagram: "grupopolisocial", linkedin: "grupopolisocial" } },
  { id: "nep", area: "social", nome: "NEP, Núcleo de Engenharia Popular", selo: "NEP", texto: "Engenharia feita por pessoas, para pessoas: projetos junto de quem vai usá-los, como um chatbot para UBS.",
    links: { site: "https://www.poli.usp.br/noticias/nep-nucleo-de-engenharia-popular/" } },
  { id: "cursinho", area: "social", nome: "Cursinho da Poli", texto: "Pré-vestibular criado em 1987 pela Escola e pelo Grêmio, para quem não pode pagar um cursinho.",
    links: { site: "https://cursinhodapoli.com.br/", instagram: "oficialcursinhodapoli", linkedin: "cursinho-da-poli" } },
  { id: "bandeira", area: "social", nome: "Bandeira Científica", texto: "Expedições de saúde e engenharia pelo interior do Brasil, desde 1957.",
    links: { site: "https://www.bandeiracientifica.com.br/", instagram: "bandeiracientifica" } },
  { id: "poli-cidada", area: "social", nome: "Poli Cidadã", texto: "O programa da Poli que estimula e apoia atividades de caráter social.",
    links: { site: "https://www.poli.usp.br/cultura-e-extensao/poli-cidada-home/" } },

  // cultura e internacional
  { id: "gtp", area: "cultura", nome: "GTP, Grupo de Teatro da Poli", selo: "GTP", texto: "Teatro na Poli desde os anos 1940, ligado ao Grêmio. Aberto a toda a cidade, de graça.",
    links: { instagram: "grupoteatropoli" } },
  { id: "ipoli", area: "cultura", nome: "iPoli", texto: "O Escritório Politécnico Internacional: intercâmbio, duplo diploma e apoio a quem vem de fora.",
    links: { site: "https://www.ipoli.com.br/", instagram: "ipoliusp", linkedin: "ipoli-escritorio-politecnico-internacional" } },

  // coletivos
  { id: "poli-negra", area: "coletivos", nome: "Poli Negra", texto: "Valorização, representatividade e permanência de estudantes negros na Poli.",
    links: { instagram: "coletivopolinegra", linkedin: "coletivopolinegra" } },
  { id: "polipride", area: "coletivos", nome: "PoliPride", texto: "Diversidade e inclusão de pessoas LGBTQIA+ na Poli, com eventos, campanhas e acolhimento.",
    links: { instagram: "coletivo.polipride", linkedin: "polipride" } },
  { id: "poligen", area: "coletivos", nome: "PoliGen", texto: "O Grupo de Estudos de Gênero da Poli: gênero na engenharia e na universidade, em estudos e debates.",
    links: { instagram: "a_poligen" } },
  { id: "politecnicas", area: "coletivos", nome: "Politécnicas (R)existem", texto: "Pela presença das mulheres na engenharia: rodas de conversa, mentorias e ações na Poli.",
    links: { instagram: "politecnicas.r.existem" } },
];

// Grupos que já passaram pela Poli, mas sem confirmação recente de que continuam ativos.
export const confirmando = ["AcappoLLi", "Poli Dance", "ABU na Poli", "CORE Júnior (Poli Santos)", "USP Mining Team", "Matemática em Movimento", "Engenheiros Sem Fronteiras, Núcleo São Paulo", "Poli Mundi"];
