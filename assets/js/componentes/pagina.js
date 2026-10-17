// Página de uma ramificação, montada a partir do registro (ramificacoes.js).
// Uso: <div data-componente="pagina" data-id="projetos"></div>
// Mostra a trilha (Início › … › página), o título, o resumo, os números,
// as seções filhas e as ações. Filhos com página própria aparecem como cartões de recurso;
// filhos sem página viram seções com âncora, com seus próprios números e, se tiverem filhos,
// uma lista de itens, cada um com âncora (ex.: projetos/#apoio e projetos/#reforco).
// Com duas ou mais seções que têm itens, a página ganha atalhos "Nesta página" no topo. Para escrever uma página à mão, troque este
// componente pelo conteúdo em HTML e mantenha a trilha com data-componente="trilha".

import { trilha } from "./trilha.js?v=202610162331";

// Pílula de estado de um nó (campo `estado` no registro).
export function pilulaEstado({ site }, no) {
  if (no.estado === "no-ar") return `<span class="pill pill--aberto">Já funciona</span>`;
  if (no.estado === "em-construcao") return `<span class="pill pill--breve">${site.portal?.lancamentoCurto ? `Chega na ${site.portal.lancamentoCurto}` : "Em construção"}</span>`;
  return "";
}

// Link "Ver também" para o nó indicado em `veja`.
export function linkVeja({ url, destino, encontrar }, no) {
  const alvo = no.veja && encontrar(no.veja);
  return alvo ? `<a class="veja" href="${url(destino(alvo.no, alvo.ancestrais))}">Ver também: ${alvo.no.titulo}</a>` : "";
}

// Cartões das subpáginas de um nó. Também usado em páginas escritas à mão
// (<div data-componente="recursos" data-id="aluno"></div>).
// estilo "portal": lista numerada, na ordem do registro, sem pílula de estado (página inicial da Área do aluno).
export function cartoes(contexto, no, ancestrais, estilo = "") {
  const { url, destino } = contexto;
  const comPagina = (no.filhos || []).filter((f) => f.caminho && !f.botao && f.cartao !== false);
  if (!comPagina.length) return "";
  const tag = estilo === "portal" ? "ol" : "ul";
  return `<${tag} class="recursos${estilo ? ` recursos--${estilo}` : ""}">${comPagina
    .map((f) => `<li><a class="recurso${f.estado ? ` recurso--${f.estado}` : ""}" href="${url(destino(f, [...ancestrais, no]))}">
        ${estilo === "portal" ? "" : pilulaEstado(contexto, f)}
        <h3>${f.titulo}</h3>
        ${f.destaque ? `<span class="indice__destaque">${f.destaque}</span>` : ""}
        ${f.resumo ? `<p>${f.resumo}</p>` : ""}
        <span class="recurso__ir">${f.chamada || `Abrir ${f.titulo.toLowerCase()}`}</span>
      </a></li>`)
    .join("")}</${tag}>`;
}

export default function pagina(alvo, contexto) {
  const { encontrar, url, destino } = contexto;
  const achado = encontrar(alvo.dataset.id);
  if (!achado) {
    alvo.innerHTML = `<p>Esta página não está no registro de ramificações.</p>`;
    return;
  }
  const { no, ancestrais } = achado;
  const filhos = no.filhos || [];
  const secoesSemPagina = filhos.filter((f) => !f.caminho);

  const fichas = (lista, classe) => lista && lista.length
    ? `<dl class="fichas ${classe}">${lista.map((n) => `<div class="ficha"><dt>${n.valor}</dt><dd>${n.rotulo}</dd></div>`).join("")}</dl>`
    : "";
  const numeros = fichas(no.numeros, "pagina__numeros");

  const acoes = no.acoes && no.acoes.length
    ? `<div class="acoes pagina__acoes">${no.acoes
        .map((a, i) => `<a class="botao${i ? " botao--linha" : ""}" href="${url(a.href)}"${a.externo ? ' target="_blank" rel="noopener"' : ""}>${a.rotulo}</a>`)
        .join("")}</div>`
    : "";

  const recursos = cartoes(contexto, no, ancestrais);
  const itens = (f) => f.filhos && f.filhos.length
    ? `<ul class="pagina__itens">${f.filhos
        .map((g) => `<li id="${g.id}">
            <h3>${g.caminho ? `<a href="${url(destino(g, [...ancestrais, no, f]))}">${g.titulo}</a>` : g.titulo}</h3>
            ${g.texto || g.resumo ? `<p>${g.texto || g.resumo}</p>` : ""}
            ${linkVeja(contexto, g)}
          </li>`)
        .join("")}</ul>`
    : "";
  const secoes = secoesSemPagina
    .map((f) => `<section class="pagina__secao" id="${f.id}">
        <h2>${f.titulo}</h2>
        ${f.texto || f.resumo ? `<p>${f.texto || f.resumo}</p>` : ""}
        ${linkVeja(contexto, f)}
        ${fichas(f.numeros, "pagina__secao-numeros")}
        ${itens(f)}
      </section>`)
    .join("");
  const comItens = secoesSemPagina.filter((f) => f.filhos && f.filhos.length);
  const atalhos = comItens.length >= 2
    ? `<nav class="pagina__atalhos" aria-label="Nesta página">${comItens.map((f) => `<a class="chip" href="#${f.id}">${f.titulo}</a>`).join("")}</nav>`
    : "";

  alvo.innerHTML = `
    ${trilha(contexto, ancestrais, no)}
    <header class="pagina__topo">
      <h1>${no.titulo}</h1>
      <p class="pagina__resumo">${no.resumo || ""}</p>
      ${numeros}
      ${acoes}
      ${no.construcao ? `<p class="estado">Página em construção: o conteúdo completo entra em breve.</p>` : ""}
      ${atalhos}
    </header>
    ${recursos ? `<div class="pagina__recursos">${recursos}</div>` : ""}
    <div class="pagina__secoes">${secoes || (recursos ? "" : `<p class="pagina__vazio">As seções desta área vão aparecer aqui conforme forem criadas.</p>`)}</div>`;
}
