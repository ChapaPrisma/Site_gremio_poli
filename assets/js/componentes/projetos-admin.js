// Painel "Projetos e parcerias" do portal interno (admin/): lançar projetos com GEX ou empresas
// (início, término previsto, o que busca atingir, situação), registrar atualizações e excluir.
// Tudo aparece na hora na página Parcerias. Usa o login das contas (mesmo banco Supabase).
// Chamado pelo painel de contas depois que o administrador entra.

import { carregarProjetos, SITUACOES } from "../dados/projetos.js?v=202610131717";
import { dataBR } from "../dados/contas.js?v=202610131717";
import { hojeSP } from "../dados/tempo.js?v=202610131717";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function avisoProjetos(texto) {
  const painel = document.getElementById("painelProjetos");
  if (painel) painel.innerHTML = `<p class="nota">${esc(texto)}</p>`;
}

export async function projetosAdmin(db, site, aviso = "") {
  const painel = document.getElementById("painelProjetos");
  if (!painel) return;
  const { ok, projetos } = await carregarProjetos(site);
  if (!ok) {
    painel.innerHTML = `<p><b>A tabela de projetos ainda não existe no banco.</b> No SQL Editor do Supabase, rode o arquivo <code>ferramentas/supabase/projetos.sql</code> do repositório e recarregue esta página.</p>`;
    return;
  }
  painel.innerHTML = `
    <form class="formulario" id="fProj" novalidate>
      <fieldset class="campo">
        <legend>Com quem</legend>
        <div class="opcoes">
          <label><input type="radio" name="tipo" value="gex" checked><span>Grupo de extensão</span></label>
          <label><input type="radio" name="tipo" value="empresa"><span>Empresa</span></label>
        </div>
      </fieldset>
      <div class="dupla">
        <div class="campo"><label for="cpTitulo">Nome do projeto</label><input type="text" id="cpTitulo" name="titulo" maxlength="140" required></div>
        <div class="campo"><label for="cpParceiro">Parceiro</label><input type="text" id="cpParceiro" name="parceiro" placeholder="Nome do GEX ou da empresa"></div>
      </div>
      <div class="tres">
        <div class="campo"><label for="cpInicio">Data de início</label><input type="date" id="cpInicio" name="inicio" value="${hojeSP()}"></div>
        <div class="campo"><label for="cpFim">Término previsto</label><input type="date" id="cpFim" name="termino_previsto"></div>
        <div class="campo"><label for="cpSit">Situação</label><select id="cpSit" name="situacao">${Object.entries(SITUACOES).map(([v, r]) => `<option value="${v}">${r}</option>`).join("")}</select></div>
      </div>
      <div class="campo"><label for="cpDesc">O que o projeto busca atingir</label><textarea id="cpDesc" name="descricao" maxlength="2000" required></textarea></div>
      <p class="formulario__erro" id="cpErro" role="alert" hidden></p>
      <div class="formulario__fim"><button class="botao" type="submit">Lançar projeto</button>${aviso ? `<p class="ok-msg">${esc(aviso)}</p>` : ""}</div>
    </form>
    <h3 style="margin-top:22px">Projetos lançados</h3>
    ${projetos.length ? `<ul class="lista-admin lista-admin--projetos">${projetos.map((p) => `<li>
        <span class="tab">${p.inicio ? dataBR(p.inicio) : "sem data"}</span>
        <span><b>${esc(p.titulo)}</b> <small>(${p.tipo === "gex" ? "GEX" : "empresa"}${p.parceiro ? `, ${esc(p.parceiro)}` : ""} · ${esc(SITUACOES[p.situacao])})</small>
          <form class="atualizar" data-projeto="${esc(p.id)}"><input type="text" name="texto" maxlength="2000" placeholder="Nova atualização do andamento" aria-label="Atualização de ${esc(p.titulo)}"><button type="submit" class="chip">Publicar</button></form>
        </span>
        <span></span>
        <button type="button" data-excluir-projeto="${esc(p.id)}">Excluir</button>
      </li>`).join("")}</ul>` : `<p class="nota">Nenhum projeto ainda.</p>`}`;

  painel.querySelector("#fProj").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), erro = painel.querySelector("#cpErro");
    const reg = {
      tipo: f.get("tipo"),
      titulo: String(f.get("titulo") || "").trim(),
      parceiro: String(f.get("parceiro") || "").trim() || null,
      inicio: f.get("inicio") || null,
      termino_previsto: f.get("termino_previsto") || null,
      situacao: f.get("situacao"),
      descricao: String(f.get("descricao") || "").trim(),
    };
    const problema = reg.titulo.length < 2 ? "Dê um nome ao projeto."
      : reg.descricao.length < 2 ? "Conte o que o projeto busca atingir."
      : reg.inicio && reg.termino_previsto && reg.termino_previsto < reg.inicio ? "O término previsto não pode ser antes do início." : "";
    if (problema) { erro.textContent = problema; erro.hidden = false; return; }
    const { error } = await db.from("projetos").insert(reg);
    if (error) { erro.textContent = "Não deu para salvar. Confira se você ainda está conectado e tente de novo."; erro.hidden = false; return; }
    projetosAdmin(db, site, `Projeto lançado: ${reg.titulo}. Já está em Parcerias.`);
  });

  painel.querySelectorAll("form.atualizar").forEach((fa) => fa.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = String(new FormData(fa).get("texto") || "").trim();
    if (texto.length < 2) return;
    const { error } = await db.from("projetos_atualizacoes").insert({ projeto_id: fa.dataset.projeto, texto, data: hojeSP() });
    projetosAdmin(db, site, error ? "" : "Atualização publicada.");
  }));

  painel.querySelectorAll("[data-excluir-projeto]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Excluir este projeto e as atualizações dele? Ele some também da página Parcerias.")) return;
    const { error } = await db.from("projetos").delete().eq("id", b.dataset.excluirProjeto);
    projetosAdmin(db, site, error ? "" : "Projeto excluído.");
  }));
}
