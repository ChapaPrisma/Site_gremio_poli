// Testes do montador de grade (assets/js/componentes/montador-grade.js) com os dados reais.
// node ferramentas/testar-montador.mjs
//
// 1. Casos pequenos das regras (práticas vinculadas, currículos, semestre letivo).
// 2. Para cada curso, currículo e semestre: monta as grades como o site e confere cada uma contra a força
//    bruta (nenhum choque, uma opção por disciplina, prática sempre com a sua teórica, nada repetido, e o
//    total igual ao de todas as combinações possíveis).
import { readFileSync } from "node:fs";
import { opcoesDe, agruparPorHorario, combinar, choca, notas, serveParaAluno, doCurso, obrigatoriasEC3, periodoDe, periodosDisponiveis, PALAVRAS_CURSO } from "../assets/js/componentes/montador-grade.js";

let falhas = 0, ok = 0;
const conferir = (cond, msg) => { if (cond) ok++; else { falhas++; console.log("  FALHOU:", msg); } };

/* ---------- 1. regras ---------- */
const T = (t, h, teorica = "") => ({ c: "X", t, teorica, h });
{
  const teo = T("1", [[0, 480, 580]]), p1 = T("9", [[1, 480, 580]], "1"), p2 = T("8", [[2, 480, 580]], "1"), so = T("5", [[3, 480, 580]]);
  const todas = [teo, p1, p2, so];
  conferir(opcoesDe(todas).map((o) => o.chaves.join("+")).join(" ") === "X|1+X|9 X|1+X|8 X|5", "teórica com duas práticas vira duas opções");
  conferir(opcoesDe([p1, p2, so], todas).every((o) => !o.chaves.includes("X|9") && !o.chaves.includes("X|8")), "prática sem a sua teórica (filtrada) não vale sozinha");
  conferir(opcoesDe([teo, so], todas).length === 1 && opcoesDe([teo, so], todas)[0].chaves[0] === "X|5", "teórica cujas práticas foram filtradas não vale sozinha");
  const orfa = T("7", [[4, 480, 580]], "3");
  conferir(opcoesDe([orfa]).length === 1, "prática cuja teórica não é oferecida vale sozinha");
  const g = agruparPorHorario(opcoesDe([T("1", [[0, 480, 580]]), T("2", [[0, 480, 580]]), T("3", [[1, 480, 580]])]));
  conferir(g.length === 2 && g[0].alternativas.length === 2, "turmas no mesmo horário viram uma opção com alternativas");
  conferir(!choca([[0, 480, 580]], [[0, 580, 680]]) && choca([[0, 480, 581]], [[0, 580, 680]]), "aula que termina quando a outra começa não é choque");
  conferir(notas([[0, 480, 580], [0, 700, 800], [2, 600, 700]]).janelas === 120 && notas([[0, 480, 580], [0, 700, 800], [2, 600, 700]]).dias === 2, "janelas e dias");

  const civilEC3 = ["Obrigatória: EP - Engenharia Civil - EC-3"], civilDCN = ["Obrigatória: EP - Engenharia Civil (EC-DCN)"], unidadeEC3 = ["Obrigatória: EP - para toda a Unidade - só EC-3"];
  conferir(serveParaAluno(civilEC3, { curso: "civil", curriculo: "ec3" }) && !serveParaAluno(civilEC3, { curso: "civil", curriculo: "dcn" }), "vaga EC-3 só para veterano");
  conferir(serveParaAluno(civilDCN, { curso: "civil", curriculo: "dcn" }) && !serveParaAluno(civilDCN, { curso: "civil", curriculo: "ec3" }), "vaga EC-DCN só para quem entrou depois");
  conferir(!serveParaAluno(civilEC3, { curso: "eletrica", curriculo: "ec3" }), "vaga de outro curso não serve");
  conferir(serveParaAluno(unidadeEC3, { curso: "eletrica", curriculo: "ec3" }) && !serveParaAluno(unidadeEC3, { curso: "eletrica", curriculo: "dcn" }), "\"para toda a Unidade - só EC-3\"");
  conferir(!serveParaAluno(["Obrigatória: IQ - para toda a Unidade"], { curso: "quimica" }), "turma só do Instituto de Química não serve para Eng. Química");
  conferir(serveParaAluno(["Obrigatória: EP - Engenharia Metalúrgica - EC-3"], { curso: "materiais-metalurgica-nuclear", curriculo: "ec3" }), "Metalúrgica conta para Materiais/Metalúrgica/Nuclear");
  conferir(serveParaAluno(["Obrigatória: EP - Engenharia de Petróleo - EC 3"], { curso: "minas-petroleo", curriculo: "ec3" }), "Petróleo conta para Minas/Petróleo");
  conferir(!serveParaAluno(["Obrigatória: EP - Engenharia Mecânica (EC-DCN)"], { curso: "mecatronica", curriculo: "dcn" }), "Mecânica não conta para Mecatrônica");
  conferir(serveParaAluno([], { curso: "civil" }), "sem detalhe de vagas, a turma fica");
  conferir(serveParaAluno(["Optativa Livre: Qualquer Unidade da USP"], { curso: "naval", curriculo: "dcn" }), "turma da Poli só com vaga livre (PNV, PME, PMR...) fica");
  conferir(!serveParaAluno(["Obrigatória: FEA - Bacharelado em Atuária", "Optativa Livre: Qualquer Unidade da USP"], { curso: "eletrica" }), "turma reservada à FEA sai, mesmo com vaga livre");
  conferir(doCurso(civilEC3, { curso: "civil" }) && !doCurso(civilEC3, { curso: "civil", curriculo: "dcn" }), "doCurso respeita o currículo");
  conferir(periodoDe("2026210").chave === "2026.2" && periodoDe("2026301").chave === "2026.2" && periodoDe("2027101").chave === "2027.1", "semestre letivo pelo código da turma");
  conferir(periodosDisponiveis(["2026201", "2027101", "2026301"]).map((p) => p.chave).join() === "2026.2,2027.1", "períodos em ordem");
}
console.log(`regras: ${ok} ok, ${falhas} falhas`);

/* ---------- 2. dados reais ---------- */
const J = JSON.parse(readFileSync(new URL("../assets/dados/turmas.json", import.meta.url), "utf8"));
const D = JSON.parse(readFileSync(new URL("../assets/dados/disciplinas.json", import.meta.url), "utf8"));
const turmas = J.turmas.map(([c, t, tipo, teorica, h, prof, vagas, grupos]) => ({ c, t, tipo, teorica, h, grupos: grupos.map(([g]) => J.grupos[g]) }));
const por = new Map(); for (const x of turmas) { if (!por.has(x.c)) por.set(x.c, []); por.get(x.c).push(x); }

function montar(siglas, aluno) {
  const lista = siglas.map((c) => {
    const todas = (por.get(c) || []).filter((x) => x.h.length);
    const usaveis = todas.filter((x) => serveParaAluno(x.grupos, aluno));
    return { c, todas, opcoes: agruparPorHorario(opcoesDe(usaveis, todas)) };
  }).filter((d) => d.opcoes.length);
  return { lista, ...combinar(lista, 100000) };
}
function verificar(rotulo, siglas, aluno) {
  const t0 = performance.now();
  const { lista, combinacoes, cortado } = montar(siglas, aluno);
  const ms = performance.now() - t0;
  const antes = falhas;
  const vistos = new Set();
  for (const esc of combinacoes) {
    const ops = esc.map((j, i) => lista[i].opcoes[j]);
    // cada alternativa do grupo tem exatamente o mesmo horário
    for (const op of ops) for (const alt of op.alternativas) if (JSON.stringify([...alt.h].sort()) !== JSON.stringify([...op.h].sort())) conferir(false, `${rotulo}: alternativa com horário diferente`);
    // nenhum choque entre disciplinas
    const blocos = ops.map((o) => o.h);
    for (let a = 0; a < blocos.length; a++) for (let b = a + 1; b < blocos.length; b++) if (choca(blocos[a], blocos[b])) conferir(false, `${rotulo}: choque entre ${lista[a].c} e ${lista[b].c}`);
    // prática sempre com a sua teórica, e só turmas da disciplina
    for (let i = 0; i < ops.length; i++) for (const alt of ops[i].alternativas) {
      for (const x of alt.turmas) {
        if (x.c !== lista[i].c) conferir(false, `${rotulo}: turma de outra disciplina`);
        if (x.teorica && lista[i].todas.some((y) => y.t === x.teorica) && !alt.turmas.some((y) => y.t === x.teorica)) conferir(false, `${rotulo}: prática ${x.c} ${x.t} sem a teórica ${x.teorica}`);
      }
    }
    const k = esc.join(","); if (vistos.has(k)) conferir(false, `${rotulo}: grade repetida`); vistos.add(k);
  }
  // força bruta: conta todas as combinações sem choque e compara
  const produto = lista.reduce((p, d) => p * d.opcoes.length, 1);
  let bruta = null;
  if (!cortado && produto <= 300000) {
    bruta = 0;
    const idx = new Array(lista.length).fill(0);
    for (let n = 0; n < produto; n++) {
      let r = n; for (let i = 0; i < lista.length; i++) { idx[i] = r % lista[i].opcoes.length; r = Math.floor(r / lista[i].opcoes.length); }
      const hs = idx.map((j, i) => lista[i].opcoes[j].h);
      let livre = true;
      for (let a = 0; a < hs.length && livre; a++) for (let b = a + 1; b < hs.length; b++) if (choca(hs[a], hs[b])) { livre = false; break; }
      if (livre) bruta++;
    }
    conferir(bruta === combinacoes.length, `${rotulo}: força bruta deu ${bruta}, o montador ${combinacoes.length}`);
  }
  if (falhas === antes) ok++;
  return { n: lista.length, pedidas: siglas.length, grades: combinacoes.length, cortado, bruta, ms };
}

const linhas = [];
for (const [curso, c] of Object.entries(D.cursos)) {
  if (!PALAVRAS_CURSO[curso]) continue;
  for (const [s, g] of Object.entries(c.grade)) {
    if (+s < 2) continue;
    const obrig = g.filter((d) => d[4] === "O").map((d) => d[0]);
    const r = verificar(`${curso} ${s}º (EC-DCN)`, obrig, { curso, curriculo: "dcn" });
    linhas.push(`${curso.padEnd(30)} ${s}º EC-DCN: ${String(r.n).padStart(2)}/${String(r.pedidas).padStart(2)} com turma → ${r.grades}${r.cortado ? "+" : ""} grades${r.bruta != null ? " (força bruta igual)" : ""} em ${r.ms.toFixed(0)} ms`);
  }
  const ec3 = obrigatoriasEC3(turmas, curso);
  // um veterano não cursa todas as obrigatórias do EC-3 de uma vez: testa conjuntos de 6, deslizando pela lista
  for (let i = 0; i + 6 <= ec3.length || (i === 0 && ec3.length); i += 3) {
    const conj = ec3.slice(i, i + 6);
    const r = verificar(`${curso} EC-3 [${conj.join(" ")}]`, conj, { curso, curriculo: "ec3" });
    linhas.push(`${curso.padEnd(30)} EC-3 (${conj.length} de ${ec3.length} obrigatórias): ${r.grades}${r.cortado ? "+" : ""} grades${r.bruta != null ? " (força bruta igual)" : ""} em ${r.ms.toFixed(0)} ms`);
    if (ec3.length < 6) break;
  }
}
console.log(linhas.join("\n"));
console.log(`\nTOTAL: ${ok} verificações ok, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
