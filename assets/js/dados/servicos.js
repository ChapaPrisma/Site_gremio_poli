// Empreendimentos do Grêmio mostrados em servicos/: logo (SVG vetorizado por
// ferramentas/vetorizar.mjs) e textos. No mapa do campus, os serviços com noPonto: true
// aparecem juntos num só marcador, com as logos lado a lado, apontando para pontoNoMapa
// (pixels de mapa-campus.js; o mapa é o mesmo dos bandejões).

// Os três ficam colados no prédio do Biênio: o marcador aponta para o Triedro.
export const pontoNoMapa = { x: 697, y: 480, nome: "Serviços do Grêmio", onde: "Prédio do Biênio" };

export const servicos = [
  {
    id: "copiadora",
    nome: "Copiadora Politécnica",
    logo: "assets/img/servicos/copiadora.svg?v=e6a35b1a",
    frase: "A salvação da véspera.",
    texto: "Plano de cotas com preços mais acessíveis durante toda a graduação, itens de conveniência e impressão de material de divulgação.",
    onde: "No prédio do Biênio, junto do Triedro",
    noPonto: true,
  },
  {
    id: "triedro",
    nome: "Lanchonete Triedro",
    logo: "assets/img/servicos/triedro.svg?v=92d2ca1e",
    frase: "Entre uma aula e outra.",
    texto: "Refeições a preços acessíveis para quem não tem tempo de ir até o bandejão.",
    onde: "No prédio do Biênio",
    noPonto: true,
  },
  {
    id: "poliglota",
    nome: "Poliglota Idiomas",
    logo: "assets/img/servicos/poliglota.svg?v=6d904fe8",
    frase: "O idioma do seu intercâmbio começa aqui.",
    texto: "Há mais de 30 anos ensinando alemão, espanhol, francês, inglês, italiano e português, com bolsas integrais para alunos.",
    numeros: [{ valor: "6", rotulo: "idiomas" }, { valor: "30+", rotulo: "anos" }, { valor: "900+", rotulo: "bolsas integrais" }],
    onde: "No prédio do Biênio, ao lado do Triedro",
    noPonto: true,
  },
];
