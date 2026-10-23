// Montador de grade (aluno/salas/#montador): dadas as disciplinas que o aluno quer cursar, todas as
// combinações de turmas sem choque de horário, e notas para ordenar (janelas, dias na Poli, horários).
// A ideia vem do MatrUSP (github.com/matrusp/matrusp), dos alunos do BCC do IME-USP; o código é próprio.
// Sem dependência do navegador: testado no Node por ferramentas/testar-montador.mjs.
//
// Uma turma: { c, t, tipo (0 teórica, 1 prática...), teorica ("" ou o código da teórica), h: [[dia, início, fim]] }
// Uma opção de uma disciplina é o que se escolhe de uma vez: a turma teórica e, se ela tiver turmas práticas
// vinculadas, uma delas junto (no JupiterWeb, a prática aponta para a teórica em "Código da Turma Teórica").

const semAcento = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// opções de uma disciplina. `turmas` são as que o aluno aceita (já filtradas); `todas`, todas as da disciplina
// no semestre: uma prática cuja teórica existe mas foi filtrada NÃO vale sozinha (ficaria sem a teórica).
export function opcoesDe(turmas, todas = turmas) {
  const teoricas = turmas.filter((x) => !x.teorica);
  const opcoes = [];
  for (const t of teoricas) {
    const praticas = turmas.filter((p) => p.teorica === t.t);
    const praticasExistem = todas.some((p) => p.teorica === t.t);
    if (!praticas.length) { if (!praticasExistem) opcoes.push([t]); }   // teórica cujas práticas foram todas filtradas: não dá para cursar sem uma
    else for (const p of praticas) opcoes.push([t, p]);
  }
  // prática cuja teórica não existe no semestre (só a prática é oferecida): vale sozinha
  for (const p of turmas) if (p.teorica && !todas.some((t) => t.t === p.teorica)) opcoes.push([p]);
  return opcoes.map((ts) => ({ turmas: ts, chaves: ts.map((x) => `${x.c}|${x.t}`), h: ts.flatMap((x) => x.h) }));
}

// Opções com o mesmo horário (só muda professor ou sala) viram uma opção, com as turmas como alternativas:
// o número de grades passa a ser o de horários diferentes de verdade.
export function agruparPorHorario(opcoes) {
  const grupos = new Map();
  for (const o of opcoes) {
    const k = o.h.map((x) => x.join(",")).sort().join(";");
    if (!grupos.has(k)) grupos.set(k, { h: o.h, alternativas: [] });
    grupos.get(k).alternativas.push(o);
  }
  return [...grupos.values()];
}

export const choca = (a, b) => a.some(([d1, i1, f1]) => b.some(([d2, i2, f2]) => d1 === d2 && i1 < f2 && i2 < f1));

// Todas as combinações sem choque (uma opção por disciplina), até o limite. As disciplinas com menos opções
// vão primeiro, para a busca cortar cedo os caminhos que não dão.
export function combinar(disciplinas, limite = 3000) {
  const ordem = disciplinas.map((d, i) => i).sort((a, b) => disciplinas[a].opcoes.length - disciplinas[b].opcoes.length);
  const saida = [], escolha = new Array(disciplinas.length);
  let cortado = false;
  (function passo(k, ocupado) {
    if (saida.length >= limite) { cortado = true; return; }
    if (k === ordem.length) { saida.push(escolha.slice()); return; }
    const i = ordem[k];
    disciplinas[i].opcoes.forEach((op, j) => {
      if (saida.length >= limite || choca(op.h, ocupado)) return;
      escolha[i] = j;
      passo(k + 1, ocupado.concat(op.h));
    });
  })(0, []);
  return { combinacoes: saida, cortado };
}

// Pares de disciplinas que não cabem juntas de jeito nenhum (toda opção de uma choca com toda opção da outra).
export function incompativeis(disciplinas) {
  const pares = [];
  for (let i = 0; i < disciplinas.length; i++) for (let j = i + 1; j < disciplinas.length; j++) {
    const a = disciplinas[i].opcoes, b = disciplinas[j].opcoes;
    if (a.length && b.length && a.every((x) => b.every((y) => choca(x.h, y.h)))) pares.push([disciplinas[i].c, disciplinas[j].c]);
  }
  return pares;
}

// Notas de uma combinação: minutos de janela entre aulas no mesmo dia, dias com aula e, em média, a hora da
// primeira aula e a da última de cada dia.
export function notas(blocos) {
  const porDia = new Map();
  for (const [d, a, b] of blocos) { if (!porDia.has(d)) porDia.set(d, []); porDia.get(d).push([a, b]); }
  let janelas = 0, inicio = 0, fim = 0;
  for (const aulas of porDia.values()) {
    aulas.sort((x, y) => x[0] - y[0]);
    let ate = aulas[0][1];
    for (let i = 1; i < aulas.length; i++) { janelas += Math.max(0, aulas[i][0] - ate); ate = Math.max(ate, aulas[i][1]); }
    inicio += aulas[0][0]; fim += ate;
  }
  const n = porDia.size || 1;
  return { janelas, dias: porDia.size, inicio: inicio / n, fim: fim / n };
}

export const ORDENS = {
  janelas: { rotulo: "Menos janelas", f: (a, b) => a.janelas - b.janelas || a.dias - b.dias },
  dias: { rotulo: "Menos dias na Poli", f: (a, b) => a.dias - b.dias || a.janelas - b.janelas },
  tarde: { rotulo: "Começa mais tarde", f: (a, b) => b.inicio - a.inicio || a.janelas - b.janelas },
  cedo: { rotulo: "Termina mais cedo", f: (a, b) => a.fim - b.fim || a.janelas - b.janelas },
};

/* ---------- quem pode se matricular em cada turma (pelos grupos de vagas do JupiterWeb) ---------- */

// palavras que aparecem nos grupos de vagas de cada curso do Guia dos cursos
export const PALAVRAS_CURSO = {
  civil: ["civil"], ambiental: ["ambiental"], computacao: ["computacao"], eletrica: ["eletrica", "eletronica e de sistemas"],
  mecanica: ["mecanica"], mecatronica: ["mecatronica"], producao: ["producao"], quimica: ["quimica"], naval: ["naval"],
  "materiais-metalurgica-nuclear": ["materiais", "metalurg", "nuclear"], "minas-petroleo": ["minas", "petroleo"],
};
const daPoli = (n) => /(^|: )EP\b/.test(n);
const curriculoDoGrupo = (n) => (/\bDCN\b/.test(n) ? "dcn" : /EC[ -]?3/i.test(n) ? "ec3" : "");

// A turma serve para o aluno? `grupos`: nomes dos grupos de vagas da turma ("Obrigatória: EP - Engenharia Civil - EC-3").
// curso: id do Guia dos cursos ou ""; curriculo: "dcn" (entrou a partir de 2025), "ec3" (antes) ou "".
// Só sai a turma reservada explicitamente para outros: muitas disciplinas dos departamentos da Poli (PME, PMR,
// PNV, PEA...) não listam vaga para o curso no JupiterWeb, só "Optativa Livre: Qualquer Unidade da USP", e os
// alunos do curso se matriculam nelas normalmente. Turma sem detalhe de vagas também fica.
export function serveParaAluno(grupos, { curso = "", curriculo = "" } = {}) {
  if (!grupos.length) return true;
  const ep = grupos.filter(daPoli);
  if (!ep.length) return !grupos.some((n) => /^Obrigat/.test(n));     // reservada (como obrigatória) a outra unidade: IQ, IF, IME, FEA...
  const palavras = PALAVRAS_CURSO[curso];
  return ep.some((n) => {
    const nn = semAcento(n), cur = curriculoDoGrupo(n);
    if (curriculo && cur && cur !== curriculo) return false;           // vaga de outro currículo
    if (/toda a unidade/.test(nn)) return true;                        // qualquer aluno da Poli (respeitando "só EC-3")
    if (!palavras) return true;
    if (palavras.some((p) => nn.includes(p))) return true;             // vaga do curso
    return !/engenharia|ciclo|habilitacao/.test(nn);                    // grupo da EP que não é de outro curso
  });
}
// a turma tem vaga reservada para o curso (e, se informado, para o currículo)?
export function doCurso(grupos, { curso = "", curriculo = "" } = {}) {
  const palavras = PALAVRAS_CURSO[curso];
  if (!palavras) return false;
  return grupos.some((n) => daPoli(n) && palavras.some((p) => semAcento(n).includes(p)) && (!curriculo || !curriculoDoGrupo(n) || curriculoDoGrupo(n) === curriculo));
}

// Obrigatórias do currículo antigo (EC-3) de um curso oferecidas no semestre: as disciplinas com turma que
// reserva vaga "Obrigatória" para o curso no EC-3. É o único jeito público de saber o que os veteranos cursam:
// o JupiterWeb não publica a grade do EC-3. `turmas`: [{ c, grupos: [nomes] }].
export function obrigatoriasEC3(turmas, curso) {
  const palavras = PALAVRAS_CURSO[curso];
  if (!palavras) return [];
  const siglas = new Set();
  for (const t of turmas) if (t.grupos.some((n) => /^Obrigat/.test(n) && daPoli(n) && curriculoDoGrupo(n) === "ec3" && palavras.some((p) => semAcento(n).includes(p)))) siglas.add(t.c);
  return [...siglas].sort();
}

/* ---------- semestre letivo das turmas ---------- */

// O código da turma começa pelo ano e pelo período: 20262xx (2026, 2º semestre), 20263xx (cursos
// quadrimestrais, junto do 2º semestre), 20271xx (2027, 1º semestre). Quando o JupiterWeb passa a mostrar o
// próximo semestre, as turmas dos dois aparecem juntas: aqui se escolhe um deles.
export const periodoDe = (codigoTurma) => {
  const ano = +String(codigoTurma).slice(0, 4), p = +String(codigoTurma)[4];
  return Number.isFinite(ano) && ano > 2000 ? { ano, sem: p === 1 ? 1 : 2, chave: `${ano}.${p === 1 ? 1 : 2}` } : null;
};
export function periodosDisponiveis(codigos) {
  const ps = new Map();
  for (const c of codigos) { const p = periodoDe(c); if (p) ps.set(p.chave, p); }
  return [...ps.values()].sort((a, b) => a.ano - b.ano || a.sem - b.sem);
}
