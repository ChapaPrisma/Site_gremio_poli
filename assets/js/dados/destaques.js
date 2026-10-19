// Destaques da Área do aluno: eventos principais, avisos e notícias do momento, no carrossel
// do topo de aluno/. Cada peça é só a imagem, com o texto já desenhado nela.
//
// Para pôr um destaque no ar: salve a imagem em assets/img/destaques/ e acrescente um item aqui.
// A ordem da lista é a ordem do carrossel. Para tirar, apague o item (e a imagem, se quiser).
//
//   imagem         1600 × 900 px (16:9), PNG ou JPG. Deixe uma margem de uns 80 px sem texto nas bordas.
//   imagemCelular  opcional, 1080 × 1350 px (4:5), usada em telas estreitas. Se um destaque tiver,
//                  faça para todos, para as peças terem a mesma altura no celular.
//   alt            o texto que está escrito na imagem, para quem usa leitor de tela. Obrigatório.
//   link           opcional: para onde o destaque leva (caminho a partir da raiz do site ou endereço completo).
//   ate            opcional: "AAAA-MM-DD". Depois desse dia o destaque some sozinho.

export const destaques = [
  {
    imagem: "assets/img/destaques/mural-de-memorias.jpg?v=a03d7dde",
    alt: "Mural de memórias: mande a sua foto da Poli. Em Meu Amor.",
    link: "aluno/meu-amor/#mande-sua-foto",
  },
  {
    imagem: "assets/img/destaques/grade-horaria.png?v=97c7e6b7",
    alt: "Monte a sua grade com as salas e baixe em PDF. Salas e grade horária.",
    link: "aluno/salas/",
  },
  {
    imagem: "assets/img/destaques/bandejoes.png?v=c5219db6",
    alt: "O cardápio de hoje dos quatro bandejões, com o caminho a pé até cada um.",
    link: "aluno/bandejoes/",
  },
];
