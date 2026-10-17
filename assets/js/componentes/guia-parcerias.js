// Parcerias (parcerias/): lista os projetos com GEX e com empresas, lançados pelos
// administradores no portal interno. Cada projeto mostra início, término previsto, o que busca
// atingir, uma barra com o quanto do prazo já passou e as atualizações do andamento.
// Uso: #listaGex e #listaEmpresa na página e <div data-componente="guia-parcerias"></div>.

import { carregarProjetos, prazo, SITUACOES } from "../dados/projetos.js?v=202610170831";
import { dataBR } from "../dados/contas.js?v=202610170831";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function cartaoProjeto(p) {
  const fr = prazo(p);
  const datas = [p.inicio ? `Início: ${dataBR(p.inicio)}` : "", p.termino_previsto ? `Término previsto: ${dataBR(p.termino_previsto)}` : ""].filter(Boolean).join(" · ");
  return `<article class="projeto projeto--${esc(p.situacao)}">
      <header class="projeto__topo">
        <span class="pill${p.situacao === "concluido" ? " pill--aberto" : p.situacao === "em-andamento" ? " pill--breve" : ""}">${esc(SITUACOES[p.situacao] || p.situacao)}</span>
        ${p.parceiro ? `<span class="projeto__parceiro">com ${esc(p.parceiro)}</span>` : ""}
      </header>
      <h4>${esc(p.titulo)}</h4>
      ${datas ? `<p class="projeto__datas">${datas}</p>` : ""}
      ${fr != null ? `<div class="projeto__prazo" role="img" aria-label="${Math.round(fr * 100)}% do prazo percorrido"><i style="width:${(fr * 100).toFixed(1)}%"></i></div><p class="projeto__prazo-rotulo">${Math.round(fr * 100)}% do prazo</p>` : ""}
      <p class="projeto__descricao">${esc(p.descricao)}</p>
      ${p.atualizacoes?.length ? `<ol class="projeto__atualizacoes">${p.atualizacoes.map((u) => `<li><b>${dataBR(u.data)}</b> ${esc(u.texto)}</li>`).join("")}</ol>` : ""}
    </article>`;
}

export default async function guiaParcerias(_alvo, { site }) {
  const gex = document.getElementById("listaGex"), emp = document.getElementById("listaEmpresa");
  if (!gex || !emp) return;
  const { projetos } = await carregarProjetos(site);
  const lista = (tipo, vazio) => {
    const ps = projetos.filter((p) => p.tipo === tipo);
    return ps.length ? ps.map(cartaoProjeto).join("") : `<div class="parc-vazio">${vazio}</div>`;
  };
  gex.innerHTML = lista("gex", "<b>Nenhum projeto lançado ainda.</b> O primeiro aparece aqui com a data de início, o término previsto e o que busca atingir. Depois, cada etapa ganha uma atualização.");
  emp.innerHTML = lista("empresa", "<b>Ainda falta a primeira.</b> Quando uma parceria com empresa começar, ela aparece aqui, com o mesmo detalhe dos projetos com os GEX.");
}
