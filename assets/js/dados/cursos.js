// Guia dos cursos (aluno/cursos/), escrito pelos centros acadêmicos, e o arquivo das turmas em Meu Amor.
// Fonte da lista de CAs, cursos, Instagram e do que já se sabe de cada centrinho: página da Poli
// "Ingressantes 2026: conheça os Centros Acadêmicos da Poli-USP". Logos em assets/img/cas/, redesenhadas
// em vetor sobre as versões publicadas pela Poli, pelos CAs e por politecnicos.com.br: CAEA, CEC, CEE, CAM
// e AEQ com geometria e letras medidas; CEN, CAEP e CMR vetorizadas com Potrace e suavizadas. A do CEC é
// a marca amarela sobre preto que o CEC usa nas redes.
//
// Para o CA preencher o guia de um curso (em `cursos`):
//   primeiroSemestre: [{ codigo: "MAT2453", nome: "Cálculo Diferencial e Integral I", dica: "texto do CA" }, ...]
//   recado: "um texto do CA para o bixo do curso"
// E o centrinho (em `centros`): centrinho: { onde: "em que prédio fica", texto: "como é", foto: "assets/img/cas/centrinho-sigla.jpg" }
//
// Foto da turma: salve em assets/img/turmas/ANO/CURSO.jpg (ex.: assets/img/turmas/2026/civil.jpg, 1600 × 900)
// e acrescente em `turmas` do curso: { ano: 2026, imagem: "assets/img/turmas/2026/civil.jpg", alt: "..." }.
// A foto mais recente abre a página do curso; todas ficam guardadas, por ano, em Meu Amor (#turmas).
// Nunca apague uma foto antiga: ela é a memória daquela turma.

// Primeiro ano do arquivo de turmas em Meu Amor (a turma que os bixos de 2027 vão conhecer).
export const arquivoDesde = 2026;

export const centros = [
  {
    id: "cec", sigla: "CEC", nome: "Centro Acadêmico de Engenharia Civil Prof. Milton Vargas",
    logo: "assets/img/cas/cec.svg?v=a21a7f42", instagram: "cecpoliusp", cursos: ["civil"],
    sobre: "Nomeado em homenagem ao professor Milton Vargas, reúne os estudantes da grande área da Engenharia Civil.",
  },
  {
    id: "caea", sigla: "CAEA", nome: "Centro Acadêmico de Engenharia Ambiental",
    logo: "assets/img/cas/caea.svg?v=4f652388", instagram: "caeapoliusp", cursos: ["ambiental"],
    sobre: "Fundado em 2016, organiza o \"Tô na Poli, e agora?\" e a Semana de Engenharia Ambiental.",
  },
  {
    id: "cee", sigla: "CEE", nome: "Centro Acadêmico de Engenharia Elétrica e de Computação",
    logo: "assets/img/cas/cee.svg?v=46675a80", instagram: "ceepoliusp", cursos: ["eletrica", "computacao"],
    sobre: "Com mais de 65 anos de história, recebe os calouros da Elétrica e da Computação.",
    centrinho: { texto: "Tem salas de estudo individuais e coletivas." },
  },
  {
    id: "cam", sigla: "CAM", nome: "Centro Acadêmico de Mecânica e Mecatrônica",
    logo: "assets/img/cas/cam.svg?v=d9554eb5", instagram: "campoliusp", cursos: ["mecanica", "mecatronica"],
    sobre: "O centro acadêmico de quem faz Mecânica ou Mecatrônica.",
    centrinho: { onde: "No prédio da Engenharia Naval, Mecânica e Mecatrônica.", texto: "Um espaço de convivência e descanso, com sofá, videogame, televisão e sinuca." },
  },
  {
    id: "cen", sigla: "CEN", nome: "Centro Acadêmico de Engenharia Naval",
    logo: "assets/img/cas/cen.svg?v=eb61d1c5", instagram: "cenpoliusp", cursos: ["naval"],
    sobre: "Acolhe todos os estudantes de Engenharia Naval, com eventos de integração.",
  },
  {
    id: "caep", sigla: "CAEP", nome: "Centro Acadêmico de Engenharia de Produção",
    logo: "assets/img/cas/caep.svg?v=ac2b3ce0", instagram: "caepusp", cursos: ["producao"],
    sobre: "Organiza a SEGEP, a Semana Acadêmica de Engenharia de Produção, e o CAEPré-cálculo.",
  },
  {
    id: "aeq", sigla: "AEQ", nome: "Associação da Engenharia Química",
    logo: "assets/img/cas/aeq.svg?v=3f9607c2", instagram: "aeqpoliusp", cursos: ["quimica"],
    sobre: "O lugar dos estudantes de Engenharia Química para conviver, conversar e descansar.",
    centrinho: { onde: "No prédio da Poli Química, ao lado do bandejão." },
  },
  {
    id: "cmr", sigla: "CMR", nome: "Centro Moraes Rêgo",
    logo: "assets/img/cas/cmr.svg?v=e3b463c0", instagram: "cmr.poli", cursos: ["materiais-metalurgica-nuclear", "minas-petroleo"],
    sobre: "Reúne os estudantes de Engenharia de Materiais, Metalúrgica, de Minas, de Petróleo e Nuclear.",
  },
];

const curso = (id, nome) => ({ id, nome, primeiroSemestre: [], recado: "", turmas: [] });

export const cursos = [
  curso("civil", "Engenharia Civil"),
  curso("ambiental", "Engenharia Ambiental"),
  curso("eletrica", "Engenharia Elétrica"),
  curso("computacao", "Engenharia de Computação"),
  curso("mecanica", "Engenharia Mecânica"),
  curso("mecatronica", "Engenharia Mecatrônica"),
  curso("naval", "Engenharia Naval"),
  curso("producao", "Engenharia de Produção"),
  curso("quimica", "Engenharia Química"),
  // No CMR, os cursos andam em dois grupos, cada um com um guia só.
  curso("materiais-metalurgica-nuclear", "Engenharia de Materiais, Metalúrgica e Nuclear"),
  curso("minas-petroleo", "Engenharia de Minas e Petróleo"),
];

export const centroDo = (idCurso) => centros.find((c) => c.cursos.includes(idCurso));
export const cursoPor = (id) => cursos.find((c) => c.id === id);
