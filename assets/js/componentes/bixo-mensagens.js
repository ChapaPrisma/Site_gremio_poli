// Mensagens daora da página Sou bixo burro: frases, fotos e vídeos de dados/bixo-mensagens.js.
// Uma peça só aparece fixa; várias viram carrossel (o mesmo do mural, ver carrossel.js).
// As frases entram em duas batidas quando aparecem na tela (sem animação se o sistema pedir menos movimento).
// Uso: <div data-componente="bixo-mensagens"></div>

import { mensagens } from "../dados/bixo-mensagens.js?v=202610181021";
import { montar } from "./carrossel.js?v=202610181021";

const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function peca(m, url) {
  if (m.tipo === "frase") {
    const frase = m.destaque ? esc(m.frase).replace(esc(m.destaque), `<mark>${esc(m.destaque)}</mark>`) : esc(m.frase);
    return `<div class="mensagem mensagem--frase">${m.antes ? `<p class="mensagem__antes">${esc(m.antes)}</p>` : ""}<p class="mensagem__frase">${frase}</p></div>`;
  }
  if (m.tipo === "foto") {
    return `<figure class="mensagem mensagem--foto"><img src="${url(m.imagem)}" alt="${esc(m.alt)}" loading="lazy">${m.legenda ? `<figcaption>${esc(m.legenda)}</figcaption>` : ""}</figure>`;
  }
  if (m.tipo === "video" && m.youtube) {
    return `<div class="mensagem mensagem--video"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(m.youtube)}" title="${esc(m.titulo)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  }
  if (m.tipo === "video" && m.arquivo) {
    return `<div class="mensagem mensagem--video"><video src="${url(m.arquivo)}"${m.capa ? ` poster="${url(m.capa)}"` : ""} controls playsinline preload="none" aria-label="${esc(m.titulo)}"></video></div>`;
  }
  return "";
}

const seta = (passo, rotulo, d) => `<button type="button" class="carrossel__seta carrossel__seta--${passo < 0 ? "ant" : "prox"}" data-passo="${passo}" aria-label="${rotulo}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg></button>`;

export default function bixoMensagens(alvo, { url }) {
  const lista = mensagens.map((m) => peca(m, url)).filter(Boolean);
  if (!lista.length) { alvo.closest("section")?.setAttribute("hidden", ""); return; }

  if (lista.length === 1) {
    alvo.innerHTML = lista[0];
  } else {
    alvo.innerHTML = `<div class="carrossel mensagens" aria-roledescription="carrossel" aria-label="Mensagens pro bixo">
      ${seta(-1, "Anterior", "M15 5l-7 7 7 7")}
      <ul class="carrossel__trilho" tabindex="0" aria-label="Mensagens; use as setas do teclado para passar">${lista.map((p) => `<li class="mensagens__item">${p}</li>`).join("")}</ul>
      ${seta(1, "Próxima", "M9 5l7 7-7 7")}
      <div class="carrossel__pontos"></div>
    </div>`;
    montar(alvo.firstElementChild);
  }

  // frases entram em duas batidas quando aparecem na tela
  const frases = alvo.querySelectorAll(".mensagem--frase");
  if (!frases.length || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  frases.forEach((f) => f.classList.add("mensagem--espera"));
  const olho = new IntersectionObserver((itens) => itens.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("mensagem--entra"); olho.unobserve(e.target); }
  }), { threshold: 0.4 });
  frases.forEach((f) => olho.observe(f));
  setTimeout(() => frases.forEach((f) => f.classList.add("mensagem--entra")), 4000); // garante que nada fica escondido
}
