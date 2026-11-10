// Painel "Reclamações das disciplinas" do portal interno (admin/): cada reclamação por extenso, com a disciplina,
// as naturezas, o semestre e o texto. Só a gestão lê o texto; o público vê apenas as contagens no Mapa das
// disciplinas (aluno/disciplinas/). A gestão marca a situação, anota e baixa tudo como planilha para levar aos
// departamentos e às comissões de coordenação de curso. Chamado pelo painel de contas depois do login.
// Tabela e regras: ferramentas/supabase/reclamacoes.sql.

import { NATUREZAS, SITUACOES_REC } from "../dados/reclamacoes.js?v=202611100009";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataHora = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
let nomes = null;

export async function reclamacoesAdmin(db, site, url, aviso = "") {
  const painel = document.getElementById("painelReclamacoes");
  if (!painel) return;
  nomes ??= await fetch(url("assets/dados/catalogo-disciplinas.json")).then((r) => r.json()).then((c) => Object.fromEntries(Object.entries(c.d).map(([s, v]) => [s, Array.isArray(v) ? v[0] : v]))).catch(() => ({}));
  const { data, error } = await db.from("reclamacoes_disciplinas").select("id, criado_em, sigla, categorias, semestre, texto, situacao, nota_gestao").order("criado_em", { ascending: false }).limit(3000);
  if (error) {
    painel.innerHTML = `<p><b>A tabela das reclamações ainda não existe no banco.</b> No SQL Editor do Supabase, rode o arquivo <code>ferramentas/supabase/reclamacoes.sql</code> do repositório e recarregue esta página.</p>`;
    return;
  }
  const filtro = painel.dataset.filtro || "nova", sigla = painel.dataset.sigla || "";
  const lista = data.filter((r) => (filtro === "todas" || r.situacao === filtro) && (!sigla || r.sigla === sigla));
  const conta = (s) => data.filter((r) => r.situacao === s).length;
  // as disciplinas com mais reclamações abertas, para escolher por onde começar
  const porDisc = {};
  for (const r of data) if (r.situacao !== "descartada") porDisc[r.sigla] = (porDisc[r.sigla] || 0) + 1;
  const topo = Object.entries(porDisc).sort((a, b) => b[1] - a[1]).slice(0, 12);
  painel.innerHTML = `
    <div class="prob-admin__topo">
      <div class="chips" role="group" aria-label="Mostrar">${[["nova", "Novas"], ["lida", "Lidas"], ["levada", "Levadas ao departamento"], ["descartada", "Descartadas"], ["todas", "Todas"]].map(([v, r]) => `<button type="button" class="chip" data-filtro="${v}" aria-pressed="${filtro === v}">${r} (${v === "todas" ? data.length : conta(v)})</button>`).join("")}</div>
      <button type="button" class="botao botao--linha botao--pequeno" id="recCsv"${data.length ? "" : " disabled"}>Baixar como planilha</button>
    </div>
    ${topo.length ? `<p class="nota" style="margin-top:10px">Mais reclamadas: ${topo.map(([s, n]) => `<button type="button" class="chip" data-sigla="${esc(s)}" aria-pressed="${sigla === s}" style="padding:2px 10px;font-size:.8rem">${esc(s)} (${n})</button>`).join(" ")}${sigla ? ` <button type="button" class="chip" data-sigla="" style="padding:2px 10px;font-size:.8rem">Todas as disciplinas</button>` : ""}</p>` : ""}
    ${aviso ? `<p class="ok-msg">${esc(aviso)}</p>` : ""}
    ${lista.length ? `<ul class="rec-admin">${lista.map((r) => `<li class="rec-admin__item">
        <p class="rec-admin__topo"><b>${esc(r.sigla)}</b> <span>${esc(nomes[r.sigla] || "")}</span> <small>${dataHora(r.criado_em)}${r.semestre ? ` · cursou em ${esc(r.semestre)}` : ""}</small></p>
        <p class="rec-admin__nat">${r.categorias.map((c) => `<span>${esc(NATUREZAS[c]?.rotulo || c)}</span>`).join("")}</p>
        ${r.texto ? `<p class="rec-admin__texto">${esc(r.texto)}</p>` : `<p class="rec-admin__sem-texto">Sem texto.</p>`}
        <form class="prob-admin__form" data-rec="${esc(r.id)}">
          <label>Situação <select name="situacao">${Object.entries(SITUACOES_REC).map(([v, t]) => `<option value="${v}"${r.situacao === v ? " selected" : ""}>${t}</option>`).join("")}</select></label>
          <label class="prob-admin__resposta">Anotação da gestão (só aqui dentro) <input type="text" name="nota" maxlength="1000" value="${esc(r.nota_gestao || "")}" placeholder="Ex.: levado à CoC da Elétrica em 12/03"></label>
          <button type="submit" class="chip">Salvar</button>
          <button type="button" class="chip prob-admin__apagar" data-apagar="${esc(r.id)}">Apagar</button>
        </form>
      </li>`).join("")}</ul>` : `<p class="nota" style="margin-top:12px">Nenhuma reclamação ${filtro === "todas" ? "ainda" : "nesta situação"}.</p>`}`;

  const refazer = (msg) => reclamacoesAdmin(db, site, url, msg);
  painel.querySelectorAll("[data-filtro]").forEach((b) => b.addEventListener("click", () => { painel.dataset.filtro = b.dataset.filtro; refazer(); }));
  painel.querySelectorAll("[data-sigla]").forEach((b) => b.addEventListener("click", () => { painel.dataset.sigla = b.dataset.sigla; refazer(); }));
  painel.querySelectorAll("form[data-rec]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = new FormData(f);
    const { error: erro } = await db.from("reclamacoes_disciplinas").update({ situacao: d.get("situacao"), nota_gestao: String(d.get("nota") || "").trim() || null }).eq("id", f.dataset.rec);
    refazer(erro ? "Não deu para salvar. Confira se você ainda está conectado." : "Salvo.");
  }));
  painel.querySelectorAll("[data-apagar]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Apagar esta reclamação de vez? Ela sai também das contagens do mapa.")) return;
    const { error: erro } = await db.from("reclamacoes_disciplinas").delete().eq("id", b.dataset.apagar);
    refazer(erro ? "Não deu para apagar agora." : "Reclamação apagada.");
  }));
  // planilha (CSV) para a pauta com os departamentos
  painel.querySelector("#recCsv")?.addEventListener("click", () => {
    const campo = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [["data", "sigla", "disciplina", "naturezas", "semestre cursado", "texto", "situação", "anotação"].join(";"),
      ...data.map((r) => [dataHora(r.criado_em), r.sigla, nomes[r.sigla] || "", r.categorias.map((c) => NATUREZAS[c]?.rotulo || c).join(", "), r.semestre || "", r.texto || "", SITUACOES_REC[r.situacao], r.nota_gestao || ""].map(campo).join(";"))];
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "reclamacoes-das-disciplinas.csv" });
    document.body.appendChild(a); a.click(); a.remove();
  });
}
