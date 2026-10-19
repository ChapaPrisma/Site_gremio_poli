// Grupos de extensão e coletivos da Poli (aluno/extensoes/), a partir de dados/extensoes.js: atalhos por
// área e, em cada área, um cartão por grupo com a logo, o que ele faz e os seus links (site e redes).
// Cada grupo pode mandar a sua página (chamada no fim de aluno/extensoes/); por ora o cartão leva às redes.
// Uso: <div data-componente="extensoes"></div>.

import { areas, grupos } from "../dados/extensoes.js?v=202610191523";

const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// iniciais para o selo de quem ainda não tem logo: "Equipe Poli de Baja" -> "PB", "Turing USP" -> "TU"
const SEM_PESO = new Set(["equipe", "de", "da", "do", "e", "grupo", "núcleo", "usp"]);
const iniciais = (nome) => {
  const palavras = nome.replace(/\.[a-z]+$/, "").split(/[\s,.()]+/).filter((p) => p && !SEM_PESO.has(p.toLowerCase()));
  if (palavras.length > 1) return (palavras[0][0] + palavras[1][0]).toUpperCase();
  const maiusculas = palavras[0].match(/[A-ZÀ-Ý]/g) || [];   // PoliSat -> PS, ThundeRatz -> TR
  return (maiusculas.length >= 2 ? maiusculas.slice(0, 2).join("") : palavras[0].slice(0, 2)).toUpperCase();
};
const ROTULO = { site: "Site", instagram: "Instagram", youtube: "YouTube" };
// a página do grupo no site da Poli (para quem ainda não tem site próprio) aparece como "Na Poli"
const rotulo = (tipo, v) => tipo === "site" && /poli\.usp\.br\/(noticias|cultura)/.test(v) ? "Na Poli" : ROTULO[tipo];
const endereco = (tipo, valor) => tipo === "instagram" ? `https://www.instagram.com/${valor}/` : valor;

export default function extensoes(alvo, { url }) {
  const cartao = (g) => `
    <li class="gex" id="${g.id}">
      <div class="gex__cabeca">${g.logo
        ? `<img class="gex__logo" src="${url(g.logo)}" alt="" width="100" height="100" loading="lazy">`
        : `<span class="gex__selo" aria-hidden="true">${esc(g.selo || iniciais(g.nome))}</span>`}<h3>${esc(g.nome)}</h3></div>
      <p>${esc(g.texto)}</p>
      <p class="gex__links">${Object.entries(g.links || {}).map(([tipo, v]) => `<a href="${esc(endereco(tipo, v))}" target="_blank" rel="noopener">${rotulo(tipo, v)}</a>`).join("")}</p>
    </li>`;
  alvo.innerHTML = `
    <nav class="gex-atalhos" aria-label="Áreas dos grupos">${areas.map((a) => `<a class="chip" href="#area-${a.id}">${esc(a.titulo)}</a>`).join("")}</nav>
    ${areas.map((a) => `
      <section class="gex-area gex-area--${a.id}" id="area-${a.id}" aria-labelledby="titulo-${a.id}">
        <h2 id="titulo-${a.id}">${esc(a.titulo)}</h2>
        <p class="bloco-portal__intro">${esc(a.texto)}</p>
        <ul class="gex-lista">${grupos.filter((g) => g.area === a.id).map(cartao).join("")}</ul>
      </section>`).join("")}
`;
}
