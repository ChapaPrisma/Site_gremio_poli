// Etiqueta "não oficial": enquanto este site for da chapa Prisma (e não do Grêmio), cada vez que o nome
// "Grêmio Politécnico" aparece na página ganha, logo depois, uma etiqueta pequena avisando que este não é um
// canal oficial do Grêmio. Vale também para o que os componentes desenham depois (cardápio, salas, mapas...).
// Não marca títulos da aba, atributos, campos de formulário, opções de menus nem desenhos SVG.
// Não levar para o app SBB Poli: o app só deve existir quando o site for do Grêmio.
//
// PARA TIRAR (quando a chapa for eleita e o site passar a ser do Grêmio): apague este arquivo e, em
// assets/js/site.js, a linha do import de nao-oficial.js e a chamada naoOficial(). O estilo mora aqui dentro.

const NOME = /Gr[êe]mio Polit[ée]cnico(?: da USP)?/gi;
const CLASSE = "tag-nao-oficial";
const AVISO = "Este site é feito pela chapa Prisma e não é um canal oficial do Grêmio Politécnico.";
const PULAR = new Set(["SCRIPT", "STYLE", "TITLE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "NOSCRIPT", "CODE"]);

const ESTILO = `
.${CLASSE} { display: inline-block; margin-left: .35em; padding: .05em .45em; border: 1px solid currentColor; border-radius: 99px;
  font: 700 .62em/1.35 var(--fonte, system-ui, sans-serif); letter-spacing: 0; text-transform: none; vertical-align: .18em;
  opacity: .72; white-space: nowrap; cursor: help; }
@media print { .${CLASSE} { opacity: 1; } }`;

function etiqueta() {
  const s = document.createElement("span");
  s.className = CLASSE;
  s.title = AVISO;
  s.textContent = "não oficial";
  return s;
}

const ignorar = (no) => {
  for (let e = no.parentElement; e; e = e.parentElement) {
    if (PULAR.has(e.tagName) || e.classList.contains(CLASSE) || e.namespaceURI === "http://www.w3.org/2000/svg" || e.hasAttribute("data-sem-etiqueta")) return true;
    if (e === document.body) return false;
  }
  return true;
};

const jaMarcado = (n) => n.nextSibling?.nodeType === 1 && n.nextSibling.classList.contains(CLASSE);

// o texto tem algum nome ainda sem etiqueta? (já marcado = o nome no fim do texto, com a etiqueta logo depois)
function precisa(n) {
  const ms = [...n.nodeValue.matchAll(NOME)];
  return ms.some((m) => m.index + m[0].length < n.nodeValue.length || !jaMarcado(n));
}

function marcar(raiz) {
  const nos = [];
  const andar = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (precisa(n) && !ignorar(n) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  for (let n = andar.nextNode(); n; n = andar.nextNode()) nos.push(n);
  for (const n of nos) {
    const texto = n.nodeValue, frag = document.createDocumentFragment();
    let ultimo = 0;
    for (const m of texto.matchAll(NOME)) {
      const fim = m.index + m[0].length;
      frag.append(texto.slice(ultimo, fim));
      if (!(fim === texto.length && jaMarcado(n))) frag.append(etiqueta());
      ultimo = fim;
    }
    if (ultimo < texto.length) frag.append(texto.slice(ultimo));
    n.replaceWith(frag);
  }
}

export default function naoOficial() {
  const estilo = document.createElement("style");
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);
  marcar(document.body);
  // o que os componentes desenharem depois também ganha a etiqueta (agrupado num quadro de animação)
  let pendentes = new Set(), agendado = false;
  new MutationObserver((mudancas) => {
    for (const m of mudancas) {
      if (m.type === "characterData") pendentes.add(m.target.parentNode);
      else m.addedNodes.forEach((n) => { if (!(n.nodeType === 1 && n.classList.contains(CLASSE))) pendentes.add(n.nodeType === 3 ? n.parentNode : n); });
    }
    if (agendado || !pendentes.size) return;
    agendado = true;
    requestAnimationFrame(() => {
      const lote = pendentes; pendentes = new Set(); agendado = false;
      for (const n of lote) if (n && n.isConnected) marcar(n);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
