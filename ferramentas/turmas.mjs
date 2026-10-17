// Turmas oferecidas no semestre (horários, professores e vagas), a partir das páginas públicas do JupiterWeb.
// Gera assets/dados/turmas.json, lido pelo montador de grade e por "Minha grade" (aluno/salas/).
//
// Crédito: a ideia de ler as turmas da página pública "obterTurma" do JupiterWeb (sem login) e de montar
// grades com elas vem do MatrUSP (github.com/matrusp/matrusp), feito por alunos do BCC do IME-USP, por sua
// vez inspirado no MatrUFSC e no CAPIM, de Ramiro Polla. O código daqui é próprio: nada do MatrUSP foi
// copiado (a licença dele não combina com este site), só aprendemos com ele onde os dados estão.
//
// Quais disciplinas: todas as da Escola Politécnica (lista pública "jupDisciplinaLista", unidade 3), as das
// grades dos cursos da Poli (assets/dados/disciplinas.json, que trazem MAT, MAC, Física...) e as que estão
// no USPolis (assets/dados/salas.json).
//
// Gentileza com a USP: uma página por vez, com PAUSA entre elas, no máximo LIMITE disciplinas por
// execução, começando pelas consultadas há mais tempo; cada disciplina vale VALIDADE. Sem nada vencido,
// a execução não chama o JupiterWeb. Nada de login, cookie ou credencial.
// Rode com Node 18+: node ferramentas/turmas.mjs (roda sozinho por .github/workflows/turmas.yml).
//
// Formato de assets/dados/turmas.json:
//   disciplinas  { SIGLA: nome }
//   turmas       [sigla, código, tipo (0 teórica, 1 prática, 2 teórica e prática...), código da teórica | "",
//                 [[dia (0 = seg), início, fim (minutos)]], [professores], [vagas, inscritos, matriculados],
//                 [[índice do grupo, vagas, matriculados]], observações]
//   grupos       nomes dos grupos de vagas ("Obrigatória: EP - Ciclo Básico Engenharia Elétrica"...)
//   consultadas  { SIGLA: dia da última consulta (dias desde 1970) }

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = "https://uspdigital.usp.br/jupiterweb/";
const AGENTE = "Site do Gremio Politecnico (turmas para o montador de grade; ideia do MatrUSP)";
const LIMITE = Number(process.env.TURMAS_LIMITE ?? 220);
const PAUSA = 1500;
const VALIDADE = 3;   // dias
const saida = fileURLToPath(new URL("../assets/dados/turmas.json", import.meta.url));
const ler = (arq) => { try { return JSON.parse(readFileSync(fileURLToPath(new URL(arq, import.meta.url)), "utf8")); } catch { return null; } };

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let pedidos = 0;
async function pagina(caminho) {
  if (pedidos++) await espera(PAUSA);
  const r = await fetch(BASE + caminho, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
  return new TextDecoder("iso-8859-1").decode(await r.arrayBuffer());
}

const ENTIDADES = { nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", atilde: "ã", otilde: "õ", acirc: "â", ecirc: "ê", ocirc: "ô", ccedil: "ç", agrave: "à", Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Atilde: "Ã", Ccedil: "Ç", amp: "&", quot: '"', lt: "<", gt: ">" };
const texto = (h) => h.replace(/<[^>]+>/g, " ").replace(/&(#\d+|\w+);/g, (m, e) => (e[0] === "#" ? String.fromCharCode(+e.slice(1)) : ENTIDADES[e] ?? m)).replace(/\s+/g, " ").trim();
// só as linhas mais internas (sem outra tabela dentro): cada uma vira a lista dos textos das células
const linhas = (html) => [...html.matchAll(/<tr[^>]*>((?:(?!<tr|<table)[\s\S])*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => texto(c[1])));

const DIAS = { seg: 0, ter: 1, qua: 2, qui: 3, sex: 4, sab: 5, "sáb": 5, dom: 6 };
const minutos = (h) => { const m = /^(\d{1,2}):(\d{2})$/.exec(h || ""); return m ? +m[1] * 60 + +m[2] : null; };
const TIPOS = { "Teórica": 0, "Prática": 1 };

function lerTurmas(html) {
  const nome = /Disciplina:\s*[A-Z0-9]{7}\s*-\s*([^<]+)/.exec(html.replace(/&(\w+);/g, (m, e) => ENTIDADES[e] ?? m));
  const turmas = [];
  let t = null, modo = null, dia = null;
  for (const l of linhas(html)) {
    const c0 = l[0] || "";
    if (/^Código da Turma Teórica/.test(c0)) { if (t) t.teorica = (l[1] || "").split(" ")[0]; continue; }
    if (/^Código da Turma/.test(c0)) { t = { codigo: (l[1] || "").split(" ")[0], teorica: "", tipo: 0, horarios: [], profs: [], total: [0, 0, 0], grupos: [], obs: "" }; turmas.push(t); modo = null; continue; }
    if (!t) continue;
    if (/^Tipo da Turma/.test(c0)) { const v = l[1] || ""; t.tipo = TIPOS[v] ?? (/Prática/.test(v) ? 2 : 0); continue; }
    if (/^Observações/.test(c0)) { t.obs = l[1] || ""; continue; }
    if (/^(Início|Fim):/.test(c0)) continue;
    if (c0 === "Horário") { modo = "horario"; continue; }
    if (l.includes("Vagas") && l.includes("Matriculados")) { modo = "vagas"; continue; }
    if (modo === "horario" && l.length >= 4) {
      // dia, início, fim, professor; linhas sem dia continuam o dia anterior (outro horário ou outro professor)
      const [d, a, b, prof] = l;
      if (d) dia = DIAS[d.toLowerCase()] ?? null;
      const ini = minutos(a), fim = minutos(b);
      if (dia != null && ini != null && fim != null) t.horarios.push([dia, ini, fim]);
      else if (dia != null && ini == null && fim != null && t.horarios.length) { const u = t.horarios.at(-1); u[2] = Math.max(u[2], fim); }
      const p = (prof || "").replace(/^\(R\)\s*/, "").trim();
      if (p && !t.profs.includes(p)) t.profs.push(p);
    } else if (modo === "vagas") {
      const n = (s) => (/^\d+$/.test(s || "") ? +s : 0);
      if (l.length === 5 && l[0]) { t.tipoVaga = l[0]; t.total[0] += n(l[1]); t.total[1] += n(l[2]); t.total[2] += n(l[4]); }
      else if (l.length === 6 && l[1]) t.grupos.push([`${t.tipoVaga}: ${l[1]}`, n(l[2]), n(l[5])]);
    }
  }
  // o mesmo dia e horário repetido (um por professor) vira um só
  for (const x of turmas) x.horarios = x.horarios.filter((h, i, a) => a.findIndex((y) => y[0] === h[0] && y[1] === h[1] && y[2] === h[2]) === i);
  return { nome: nome ? nome[1].trim() : "", turmas: turmas.filter((x) => x.codigo) };
}

const hoje = Math.floor(Date.now() / 864e5);
const anterior = ler("../assets/dados/turmas.json") || { disciplinas: {}, turmas: [], grupos: [], consultadas: {} };
const grupos = [...(anterior.grupos || [])];
const idGrupo = (g) => { let i = grupos.indexOf(g); if (i < 0) { i = grupos.length; grupos.push(g); } return i; };
const porSigla = new Map();
for (const t of anterior.turmas || []) { if (!porSigla.has(t[0])) porSigla.set(t[0], []); porSigla.get(t[0]).push(t); }
const consultadas = { ...(anterior.consultadas || {}) };
const disciplinas = { ...(anterior.disciplinas || {}) };

try {
  // quais disciplinas consultar
  const lista = await pagina("jupDisciplinaLista?letra=A-Z&tipo=T&codcg=3");
  const daPoli = [...new Set([...lista.matchAll(/sgldis=([A-Z0-9]{7})/g)].map((m) => m[1]))];
  const indice = ler("../assets/dados/disciplinas.json");
  const dasGrades = Object.values(indice?.cursos || {}).flatMap((c) => [...(c.primeiro || []), ...(c.optativas || []), ...Object.values(c.grade || {}).flat()].map((d) => d[0]));
  const doUspolis = Object.keys(ler("../assets/dados/salas.json")?.disciplinas || {});
  const todas = [...new Set([...daPoli, ...dasGrades, ...doUspolis])].filter((s) => /^[A-Z0-9]{7}$/.test(s));
  const vencidas = todas.filter((s) => !consultadas[s] || hoje - consultadas[s] >= VALIDADE).sort((a, b) => (consultadas[a] || 0) - (consultadas[b] || 0)).slice(0, LIMITE);

  for (const sigla of vencidas) {
    try {
      const { nome, turmas } = lerTurmas(await pagina(`obterTurma?print=true&sgldis=${sigla}`));
      consultadas[sigla] = hoje;
      if (!turmas.length) { porSigla.delete(sigla); continue; }
      if (nome) disciplinas[sigla] = nome;
      porSigla.set(sigla, turmas.map((t) => [sigla, t.codigo, t.tipo, t.teorica, t.horarios, t.profs, t.total, t.grupos.map(([g, v, m]) => [idGrupo(g), v, m]), t.obs]));
    } catch (erro) {
      console.warn(`${sigla}: ${erro.message}`);
      if (/HTTP 5\d\d|timeout|aborted/i.test(erro.message)) break;   // o JupiterWeb está mal: tenta amanhã
    }
  }

  // só as disciplinas ainda na lista e com turma; nomes e grupos que ninguém mais usa saem
  const turmas = todas.flatMap((s) => porSigla.get(s) || []);
  const usados = new Set(turmas.flatMap((t) => t[7].map((g) => g[0])));
  const novoIndice = new Map([...usados].sort((a, b) => a - b).map((g, i) => [g, i]));
  for (const t of turmas) t[7] = t[7].map(([g, v, m]) => [novoIndice.get(g), v, m]);
  const comTurma = new Set(turmas.map((t) => t[0]));
  const dados = {
    fonte: "JupiterWeb (uspdigital.usp.br/jupiterweb), páginas públicas de turmas; ideia do MatrUSP (github.com/matrusp/matrusp)",
    atualizadoEm: new Date().toISOString(),
    disciplinas: Object.fromEntries(Object.entries(disciplinas).filter(([s]) => comTurma.has(s)).sort()),
    grupos: [...novoIndice.keys()].map((g) => grupos[g]),
    turmas,
    consultadas: Object.fromEntries(todas.filter((s) => consultadas[s]).map((s) => [s, consultadas[s]])),
  };
  writeFileSync(saida, JSON.stringify(dados) + "\n");
  const faltam = todas.filter((s) => !consultadas[s]).length;
  console.log(`turmas.json: ${comTurma.size} disciplinas com turma, ${turmas.length} turmas (${vencidas.length} consultadas agora, ${faltam} nunca consultadas), ${pedidos} pedidos ao JupiterWeb.`);
} catch (erro) {
  console.error("JupiterWeb não respondeu como esperado:", erro.message, "Arquivo anterior mantido.");
  process.exit(1);
}

