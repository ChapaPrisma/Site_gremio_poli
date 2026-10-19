// Painel "Mapa de problemas" do portal interno (admin/): todos os registros por extenso, com a foto, o lugar,
// os apoios e a situação. A gestão muda a situação, responde (a resposta aparece no mapa público), apaga e
// baixa tudo como planilha para levar à diretoria da Poli. Chamado pelo painel de contas depois do login.
// Tabelas e regras: ferramentas/supabase/problemas.sql.

import { CATEGORIAS, SITUACOES, carregarProblemas, iconeSvg } from "../dados/problemas.js?v=202610191546";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataHora = (iso) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const ORIGEM = { gps: "localização do celular", foto: "localização da foto", mapa: "marcado no mapa" };

export async function problemasAdmin(db, site, aviso = "") {
  const painel = document.getElementById("painelProblemas");
  if (!painel) return;
  const { ok, problemas } = await carregarProblemas(site, { admin: true });
  if (!ok) {
    painel.innerHTML = `<p><b>A tabela do mapa de problemas ainda não existe no banco.</b> No SQL Editor do Supabase, rode o arquivo <code>ferramentas/supabase/problemas.sql</code> do repositório e recarregue esta página.</p>`;
    return;
  }
  const filtro = painel.dataset.filtro || "aberto";
  const lista = problemas.filter((p) => filtro === "todos" || p.situacao === filtro);
  const conta = (s) => problemas.filter((p) => p.situacao === s).length;
  painel.innerHTML = `
    <div class="prob-admin__topo">
      <div class="chips" role="group" aria-label="Mostrar">${[["aberto", "Abertos"], ["encaminhado", "Levados à diretoria"], ["resolvido", "Resolvidos"], ["descartado", "Descartados"], ["todos", "Todos"]].map(([v, r]) => `<button type="button" class="chip" data-filtro="${v}" aria-pressed="${filtro === v}">${r} (${v === "todos" ? problemas.length : conta(v)})</button>`).join("")}</div>
      <button type="button" class="botao botao--linha botao--pequeno" id="probCsv"${problemas.length ? "" : " disabled"}>Baixar como planilha</button>
    </div>
    ${aviso ? `<p class="ok-msg">${esc(aviso)}</p>` : ""}
    ${lista.length ? `<ul class="prob-admin">${lista.map((p) => `<li class="prob-admin__item" data-id="${esc(p.id)}">
        <div class="prob-admin__foto">${p.tem_foto ? `<a href="#" data-foto="${esc(p.id)}" target="_blank" rel="noopener"><img alt="Foto do problema" data-foto-img="${esc(p.id)}"></a>` : `<span>Sem foto</span>`}</div>
        <div class="prob-admin__corpo">
          <p class="prob-admin__cat">${iconeSvg(p.categoria, 22)}<b>${esc(CATEGORIAS[p.categoria]?.rotulo || p.categoria)}</b> <small>${dataHora(p.criado_em)}</small></p>
          <p>${esc(p.texto)}</p>
          <p class="prob-admin__meta">${p.apoios} apoio${p.apoios === 1 ? "" : "s"} · lugar: ${esc(ORIGEM[p.origem_local] || "")}${p.precisao ? ` (±${Math.round(p.precisao)} m)` : ""} · <a href="https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=19/${p.lat}/${p.lon}" target="_blank" rel="noopener">ver no mapa</a></p>
          <form class="prob-admin__form" data-problema="${esc(p.id)}">
            <label>Situação <select name="situacao">${Object.entries(SITUACOES).map(([v, r]) => `<option value="${v}"${p.situacao === v ? " selected" : ""}>${r}</option>`).join("")}</select></label>
            <label class="prob-admin__resposta">Resposta pública (aparece no mapa) <input type="text" name="resposta" maxlength="1000" value="${esc(p.resposta || "")}" placeholder="Ex.: levado à diretoria da Poli em 20/10; conserto previsto para novembro"></label>
            <button type="submit" class="chip">Salvar</button>
            <button type="button" class="chip prob-admin__apagar" data-apagar="${esc(p.id)}" data-foto-tem="${p.tem_foto}">Apagar</button>
          </form>
        </div>
      </li>`).join("")}</ul>` : `<p class="nota">Nenhum registro ${filtro === "todos" ? "ainda" : "nesta situação"}.</p>`}`;

  // fotos do bucket privado: links temporários (1 hora), só para quem está logado como administrador
  const comFoto = lista.filter((p) => p.tem_foto).map((p) => `${p.id}.jpg`);
  if (comFoto.length) {
    const { data } = await db.storage.from("problemas").createSignedUrls(comFoto, 3600);
    for (const s of data || []) {
      if (!s.signedUrl) continue;
      const id = s.path.replace(/\.jpg$/, "");
      const img = painel.querySelector(`[data-foto-img="${id}"]`), a = painel.querySelector(`[data-foto="${id}"]`);
      if (img) img.src = s.signedUrl; if (a) a.href = s.signedUrl;
    }
  }

  painel.querySelectorAll("[data-filtro]").forEach((b) => b.addEventListener("click", () => { painel.dataset.filtro = b.dataset.filtro; problemasAdmin(db, site); }));
  painel.querySelectorAll(".prob-admin__form").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = new FormData(f);
    const { error } = await db.from("problemas").update({ situacao: d.get("situacao"), resposta: String(d.get("resposta") || "").trim() || null }).eq("id", f.dataset.problema);
    problemasAdmin(db, site, error ? "Não deu para salvar. Confira se você ainda está conectado." : "Salvo. O mapa público já mostra a mudança.");
  }));
  painel.querySelectorAll("[data-apagar]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Apagar este registro de vez? A foto também é apagada.")) return;
    if (b.dataset.fotoTem === "true") await db.storage.from("problemas").remove([`${b.dataset.apagar}.jpg`]);
    const { error } = await db.from("problemas").delete().eq("id", b.dataset.apagar);
    problemasAdmin(db, site, error ? "Não deu para apagar agora." : "Registro apagado.");
  }));
  // planilha (CSV) com todos os registros, para a pauta com a diretoria da Poli
  painel.querySelector("#probCsv")?.addEventListener("click", () => {
    const campo = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [["data", "natureza", "texto", "situação", "apoios", "resposta", "latitude", "longitude", "lugar", "tem foto"].join(";"),
      ...problemas.map((p) => [dataHora(p.criado_em), CATEGORIAS[p.categoria]?.rotulo || p.categoria, p.texto, SITUACOES[p.situacao], p.apoios, p.resposta || "", p.lat.toFixed(6), p.lon.toFixed(6), ORIGEM[p.origem_local] || "", p.tem_foto ? "sim" : "não"].map(campo).join(";"))];
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "mapa-de-problemas.csv" });
    document.body.appendChild(a); a.click(); a.remove();
  });
}
