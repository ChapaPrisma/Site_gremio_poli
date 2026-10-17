// Montador de grade (aluno/salas/#montador): dadas as disciplinas que o aluno quer cursar, todas as
// combinações de turmas sem choque de horário, e notas para ordenar (janelas, dias na Poli, horários).
// A ideia vem do MatrUSP (github.com/matrusp/matrusp), dos alunos do BCC do IME-USP; o código é próprio.
// Sem dependência do navegador, para poder ser testado no Node.
//
// Uma turma: { c, t, tipo (0 teórica, 1 prática...), teorica ("" ou o código da teórica), h: [[dia, início, fim]] }
// Uma opção de uma disciplina é o que se escolhe de uma vez: a turma teórica e, se ela tiver turmas práticas
// vinculadas, uma delas junto (no JupiterWeb, a prática aponta para a teórica em "Código da Turma Teórica").

export function opcoesDe(turmas) {
  const teoricas = turmas.filter((x) => !x.teorica);
  const opcoes = [];
  for (const t of teoricas) {
    const praticas = turmas.filter((p) => p.teorica === t.t);
    if (!praticas.length) opcoes.push([t]);
    else for (const p of praticas) opcoes.push([t, p]);
  }
  // prática cuja teórica não está na lista: vale sozinha
  for (const p of turmas) if (p.teorica && !teoricas.some((t) => t.t === p.teorica)) opcoes.push([p]);
  return opcoes.map((ts) => ({ turmas: ts, chaves: ts.map((x) => `${x.c}|${x.t}`), h: ts.flatMap((x) => x.h) }));
}

const choca = (a, b) => a.some(([d1, i1, f1]) => b.some(([d2, i2, f2]) => d1 === d2 && i1 < f2 && i2 < f1));

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
    for (let i = 1; i < aulas.length; i++) janelas += Math.max(0, aulas[i][0] - aulas[i - 1][1]);
    inicio += aulas[0][0]; fim += Math.max(...aulas.map((x) => x[1]));
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
