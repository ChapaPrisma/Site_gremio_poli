// Cabeçalho: faixa de aviso, marca, menu e gaveta lateral com o índice do site.
// O botão "Índice do site" (com borda, em destaque) abre a gaveta. No celular ele vira
// "Índice" e a gaveta também traz os links do menu.
// Qualquer elemento com data-abrir-gaveta, em qualquer lugar da página, abre a mesma gaveta.

import { arvore, arvoreDaArea } from "./indice.js?v=202610190021";

export default function cabecalho(alvo, contexto) {
  const { site, url } = contexto;
  const link = (i) => (i.local ? i.href : url(i.href));

  // Numa área com índice próprio (ex.: Área do aluno), a gaveta abre com esse índice, já que o
  // índice lateral some em telas estreitas; o restante do site vem logo abaixo.
  const area = document.querySelector('[data-componente="indice"][data-raiz]')?.dataset.raiz;
  const indiceDaArea = area && contexto.encontrar(area)
    ? `<nav class="indice indice--gaveta indice--gaveta-area" aria-label="Índice: ${contexto.encontrar(area).no.titulo}">${arvoreDaArea(contexto, area)}</nav>`
    : "";

  const aviso = site.aviso
    ? `<div class="aviso"><div class="container">${site.aviso.texto}${
        site.aviso.link ? ` <a href="${url(site.aviso.link.href)}">${site.aviso.link.rotulo}</a>` : ""}${
        site.aviso.autoria ? ` <span class="aviso__autoria"><img src="${url(site.aviso.autoria.logo)}" alt="" width="16" height="18">${site.aviso.autoria.texto} <a href="${site.aviso.autoria.href}" target="_blank" rel="noopener">${site.aviso.autoria.rotulo}</a></span>` : ""
      }</div></div>`
    : "";

  const itens = site.menu.map((i) => `<a href="${link(i)}">${i.rotulo}</a>`).join("");
  const iconeAcesso = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`;
  // Botão de acesso: fica visível em todas as larguras, inclusive no celular.
  const chamada = site.chamada
    ? `<a class="botao botao--acesso" href="${url(site.chamada.href)}">${iconeAcesso}<span>${site.chamada.rotulo}</span></a>`
    : "";
  // capelo de formatura: o detalhe do botão da Área do politécnico
  const iconeCapelo = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/><path d="M22 9v5"/></svg>`;
  const acessos = (site.acessos || [])
    .map((a, i) => `<a class="botao ${i ? "botao--linha" : "botao--acesso"}${a.id === "politecnico" ? " botao--politecnico" : ""}" href="${url(a.href)}">${i ? "" : iconeAcesso}${a.id === "politecnico" ? iconeCapelo : ""}<span>${a.rotulo}</span></a>`)
    .join("");

  const iconeIndice = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h10M4 18h13"/></svg>`;

  alvo.innerHTML = `${aviso}
    <header class="cabecalho">
      <div class="container cabecalho__barra">
        <a class="marca" href="${url("./")}" aria-label="${site.nomeCompleto}, página inicial">
          <img src="${url("assets/img/marca/gremio-azul.png?v=bef84bef")}" alt="" width="40" height="40">
          <span>${site.nome}</span>
        </a>
        <button class="botao--indice cabecalho__indice" type="button" data-abrir-gaveta aria-haspopup="dialog">${iconeIndice}Índice do site</button>
        <nav class="cabecalho__menu" aria-label="Principal">${itens}</nav>
        ${chamada}
        <button class="botao--indice cabecalho__menu-botao" type="button" data-abrir-gaveta aria-haspopup="dialog" aria-label="Índice do site">${iconeIndice}<span>Índice</span></button>
      </div>
    </header>
    <dialog class="gaveta" aria-label="Índice do site">
      <div class="gaveta__topo">
        <span class="gaveta__titulo">Índice do site</span>
        <button class="gaveta__fechar" type="button" data-fechar-gaveta>Fechar</button>
      </div>
      <div class="gaveta__acessos">${acessos}</div>
      ${indiceDaArea}<nav class="indice indice--gaveta" aria-label="Índice do site">${indiceDaArea ? `<p class="gaveta__secao">Todo o site</p>` : ""}${arvore(contexto, "gaveta")}</nav>
      <div class="gaveta__menu">${itens}</div>
    </dialog>`;

  const gaveta = alvo.querySelector(".gaveta");
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-abrir-gaveta]")) gaveta.showModal();
  });
  alvo.querySelector("[data-fechar-gaveta]").addEventListener("click", () => gaveta.close());
  // Fecha ao clicar fora do painel ou ao seguir um link.
  gaveta.addEventListener("click", (e) => {
    if (e.target === gaveta || e.target.closest("a")) gaveta.close();
  });
}
