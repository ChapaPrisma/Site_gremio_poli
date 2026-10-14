// Os quatro bandejões da Cidade Universitária: horários de dias letivos (minutos desde 0h),
// posição no mapa do campus (x, y em pixels de mapa-campus.js), coordenadas e descrição.
// Fontes: página "Bandejão" do Instituto de Física da USP (horários e locais) e
// "Como chegar" da Poli-USP, conferidas em outubro de 2026.
// Usado pelo painel "Bandejões agora" (página inicial) e pelo guia dos bandejões (aluno/bandejoes/).
// `cardapio` é o número do restaurante no serviço do Cardápio+ (ver ferramentas/cardapio.mjs).

export const bandejoes = [
  {
    id: "central", nome: "Central", completo: "Restaurante Central", cardapio: 6,
    x: 1254.8, y: 620.8, lat: -23.55992, lon: -46.72115,
    onde: "Perto da Reitoria, no centro do campus. O Caixa Central, onde se compram créditos, fica ao lado.",
    destaque: "Único com café da manhã e o único aberto aos sábados. Suco à vontade no jantar.",
    semana: [["Café da manhã", 420, 510], ["Almoço", 660, 840], ["Jantar", 1050, 1185]],
    sabado: [["Café da manhã", 450, 510], ["Almoço", 660, 830]],
  },
  {
    id: "fisica", nome: "Física", completo: "Bandejão da Física", cardapio: 8,
    x: 566.9, y: 671.7, lat: -23.56074, lon: -46.7356,
    onde: "Ao lado do Instituto de Física, na Rua do Matão.",
    destaque: "Suco à vontade no almoço e no jantar.",
    semana: [["Almoço", 660, 840], ["Jantar", 1050, 1185]],
    sabado: [],
  },
  {
    id: "quimica", nome: "Química", completo: "Bandejão da Química", cardapio: 9,
    x: 1044.9, y: 807.6, lat: -23.56348, lon: -46.7256,
    onde: "No Conjunto das Químicas, na Av. Prof. Lineu Prestes, vizinho da Engenharia Química da Poli.",
    destaque: "Almoço e jantar nos dias de semana.",
    semana: [["Almoço", 660, 840], ["Jantar", 1050, 1185]],
    sabado: [],
  },
  {
    id: "prefeitura", nome: "Prefeitura", completo: "Bandejão da Prefeitura (PCO)", cardapio: 7,
    x: 378.7, y: 586.8, lat: -23.55905, lon: -46.73953,
    onde: "Perto da Prefeitura do Campus, no lado oeste da Cidade Universitária.",
    destaque: "Só almoço. Não abre para o jantar.",
    semana: [["Almoço", 660, 840]],
    sabado: [],
  },
];

// Hora e data em São Paulo vêm de tempo.js (também usado pelas salas).
import { hora, agoraSP, hojeSP } from "./tempo.js?v=202610141956";
export { hora, agoraSP, hojeSP };

export function situacao(b, { dia, minuto } = agoraSP()) {
  const lista = dia >= 1 && dia <= 5 ? b.semana : dia === 6 ? b.sabado : [];
  if (!lista.length) return { aberto: false, texto: dia === 0 ? "Fechado aos domingos" : "Fechado hoje" };
  for (const [refeicao, abre, fecha] of lista) if (minuto >= abre && minuto < fecha) return { aberto: true, texto: `${refeicao} até ${hora(fecha)}` };
  for (const [refeicao, abre] of lista) if (minuto < abre) return { aberto: false, texto: `Abre às ${hora(abre)} (${refeicao.toLowerCase()})` };
  return { aberto: false, texto: "Fechado por hoje" };
}

export const temJantar = (b) => b.semana.some((r) => r[0] === "Jantar");

// Cardápio da semana gerado por ferramentas/cardapio.mjs. Retorna null se o arquivo não carregar.
let pedido = null;
export function carregarCardapio(raiz) {
  pedido ??= fetch(new URL("assets/dados/cardapio.json", raiz), { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return pedido;
}
