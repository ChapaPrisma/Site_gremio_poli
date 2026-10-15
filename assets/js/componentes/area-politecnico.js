// Área do politécnico (politecnico/): a rede de ex-alunos. "Encontre a sua turma" busca por curso e
// ano de entrada na vitrine pública (view politecnicos_publico do Supabase; ferramentas/supabase/
// politecnico.sql). Enquanto a tabela não existe, a busca mostra a turma vazia com o convite para
// entrar na rede. Os formulários (entrar na rede, mandar fotos) passam pelo aviso de proposta.
// Uso: marcação em politecnico/index.html e <div data-componente="area-politecnico"></div>.

import { cursos } from "../dados/cursos.js?v=202610142345";
import { supabase, configurado } from "../dados/contas.js?v=202610142345";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nomeCurso = (id) => cursos.find((c) => c.id === id)?.nome || id;

export default async function areaPolitecnico(_alvo, { site }) {
  const fTurma = document.getElementById("fTurma");
  if (!fTurma) return;
  const anoAtual = new Date().getFullYear();
  const opcoesCurso = `<option value="">Todos os cursos</option>` + cursos.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("");
  const opcoesAno = Array.from({ length: anoAtual - 1950 + 1 }, (_, i) => anoAtual - i).map((a) => `<option>${a}</option>`).join("");
  // na busca, "Todos os cursos"; no cadastro, a pessoa escolhe o dela
  document.querySelectorAll("[data-cursos]").forEach((s) => (s.innerHTML = s.closest("[data-local]") ? opcoesCurso : opcoesCurso.replace('<option value="">Todos os cursos</option>', '<option value="">Escolha o curso</option>')));
  document.querySelectorAll("[data-anos]").forEach((s) => (s.innerHTML = `<option value="">Escolha o ano</option>` + opcoesAno));

  const saida = document.getElementById("turmaResultado");
  // o banco carrega em segundo plano; a busca não espera por ele mais de 6 segundos
  const banco = configurado(site) ? supabase(site).catch(() => null) : Promise.resolve(null);
  const limite = (p) => Promise.race([p, new Promise((ok) => setTimeout(() => ok(null), 6000))]);

  fTurma.addEventListener("submit", async (e) => {
    e.preventDefault();
    const curso = fTurma.curso.value, ano = fTurma.ano.value;
    if (!ano) { saida.innerHTML = `<p class="turma-vazia">Escolha o ano em que você entrou na Poli.</p>`; return; }
    const rotulo = `${curso ? nomeCurso(curso) : "Poli"}, turma de ${ano}`;
    saida.innerHTML = `<p class="nota">Procurando a turma…</p>`;
    let pessoas = [];
    const db = await limite(banco);
    if (db) {
      let q = db.from("politecnicos_publico").select("nome, curso, ano_ingresso, ano_formatura, cidade, onde_trabalha").eq("ano_ingresso", Number(ano)).order("nome");
      if (curso) q = q.eq("curso", curso);
      const r = await limite(q);
      if (r && !r.error && r.data) pessoas = r.data;
    }
    saida.innerHTML = pessoas.length
      ? `<h3>${esc(rotulo)}</h3><ul class="turma-lista">${pessoas.map((p) => `<li><b>${esc(p.nome)}</b><span>${esc(nomeCurso(p.curso))}${p.ano_formatura ? `, formado em ${p.ano_formatura}` : ""}</span>${p.onde_trabalha || p.cidade ? `<small>${esc([p.onde_trabalha, p.cidade].filter(Boolean).join(" · "))}</small>` : ""}</li>`).join("")}</ul>`
      : `<div class="turma-vazia"><b>${esc(rotulo)}</b><p>Ninguém dessa turma entrou na rede ainda. Que tal ser o primeiro? Quem entra ajuda os outros a se acharem.</p><a class="botao botao--pequeno" href="#entrar">Entrar para a rede</a></div>`;
  }, true);
}
