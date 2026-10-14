// Carrossel de destaques (eventos, avisos e notícias do momento), no topo da Área do aluno.
// As peças vêm de dados/destaques.js; cada uma é só a imagem, com o texto desenhado nela.
// Uso: <div data-componente="destaques"></div>. Sem destaques no ar, a seção some.

import { destaques } from "../dados/destaques.js?v=202610141927";
import { montar } from "./carrossel.js?v=202610141927";

const seta = (passo, rotulo, d) => `<button type="button" class="carrossel__seta carrossel__seta--${passo < 0 ? "ant" : "prox"}" data-passo="${passo}" aria-label="${rotulo}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></button>`;
const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export default function montarDestaques(alvo, { url }) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const lista = destaques.filter((d) => !d.ate || d.ate >= hoje);
  const secao = alvo.closest("section");
  if (!lista.length) { if (secao) secao.hidden = true; return; }

  const celular = lista.every((d) => d.imagemCelular);
  const peca = (d, i) => {
    const img = `<img src="${url(d.imagem)}" alt="${esc(d.alt)}" width="1600" height="900"${i ? ' loading="lazy"' : ""}>`;
    const foto = d.imagemCelular ? `<picture><source media="(max-width: 560px)" srcset="${url(d.imagemCelular)}">${img}</picture>` : img;
    return `<li class="destaque">${d.link ? `<a href="${url(d.link)}">${foto}</a>` : foto}</li>`;
  };

  alvo.innerHTML = `<div class="carrossel destaques${celular ? " destaques--celular" : ""}" aria-roledescription="carrossel" aria-label="Destaques do momento">
    ${lista.length > 1 ? seta(-1, "Destaque anterior", "M15 5l-7 7 7 7") : ""}
    <ul class="carrossel__trilho" tabindex="0" aria-label="Destaques; use as setas do teclado para passar">${lista.map(peca).join("")}</ul>
    ${lista.length > 1 ? seta(1, "Próximo destaque", "M9 5l7 7-7 7") : ""}
    <div class="carrossel__pontos"></div>
  </div>`;
  const c = alvo.firstElementChild;
  // Tocar numa peça do lado só a traz para o centro; o link vale para a peça da vez.
  c.querySelectorAll(".destaque > a").forEach((a) => a.addEventListener("click", (e) => {
    if (!a.parentElement.classList.contains("ativa")) e.preventDefault();
  }));
  montar(c);
  if (lista.length < 2) c.querySelector(".carrossel__pontos").hidden = true;
}
