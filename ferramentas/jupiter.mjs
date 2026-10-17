// Fichas das disciplinas (créditos, ementa, avaliação e bibliografia) e as matérias do primeiro
// semestre de cada curso, a partir do JupiterWeb. Gera:
//   assets/dados/disciplinas.json            índice leve: cursos (1º semestre) e nome/créditos de cada sigla
//   assets/dados/disciplinas/<SIGLA>.json    a ficha completa, lida pelo site só quando alguém abre
//
// Crédito: o caminho até esses dados foi mapeado pelo projeto usp-mcp, de Caio Castro e João Pedro
// Gunthen (github.com/CaioCastro1/mcp-usp, licença MIT). Foram eles que descobriram que o JupiterWeb
// tem uma interface pública e sem login (o bean "ControlePublicoDWR", que fala DWR) e documentaram o
// formato das chamadas e das respostas. O leitor de respostas abaixo é uma tradução para JavaScript
// do usp_mcp/jupiter/dwr.py deles (Copyright (c) Caio Castro e João Pedro Gunthen, licença MIT).
//
// Gentileza com a USP: uma requisição por vez, com pausa entre elas, no máximo LIMITE fichas novas por
// execução, e cada ficha guardada por um semestre (ementa não muda por pergunta). As grades dos cursos
// são buscadas no máximo uma vez por mês. Sem ficha faltando nem grade vencida, a execução não chama o JupiterWeb. Nada de login, cookie ou credencial.
// Rode com Node 18+: node ferramentas/jupiter.mjs (hoje roda sozinho por .github/workflows/jupiter.yml).

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const URL_DWR = "https://uspdigital.usp.br/jupiterweb/dwr/call/plaincall/ControlePublicoDWR";
const AGENTE = "Site do Gremio Politecnico (fichas de disciplinas; caminho mapeado pelo usp-mcp)";
const LIMITE = Number(process.env.JUPITER_LIMITE ?? 50);   // fichas novas ou vencidas por execução
const PAUSA = 1500;                        // ms entre uma requisição e outra
const VALIDADE_FICHA = 120 * 864e5;        // um semestre
const VALIDADE_GRADE = 30 * 864e5;         // um mês: as grades dos cursos quase nunca mudam
const indiceArq = fileURLToPath(new URL("../assets/dados/disciplinas.json", import.meta.url));
const pastaFichas = fileURLToPath(new URL("../assets/dados/disciplinas/", import.meta.url));
const salasArq = fileURLToPath(new URL("../assets/dados/salas.json", import.meta.url));

// Os cursos do Guia dos cursos (assets/js/dados/cursos.js) e o trecho do nome da habilitação no
// JupiterWeb. Os cursos que entram por um ciclo básico comum usam a grade desse ciclo.
const CURSOS = {
  civil: "Engenharia Civil", ambiental: "Engenharia Ambiental", computacao: "Engenharia de Computação",
  eletrica: "Ciclo Básico - Engenharia Elétrica", mecanica: "Engenharia Mecânica", mecatronica: "Engenharia Mecatrônica",
  producao: "Engenharia de Produção", quimica: "Engenharia Química", naval: "Engenharia Naval",
  "materiais-metalurgica-nuclear": "Ciclo Básico - Materiais", materiais: "Ciclo Básico - Materiais",
  metalurgica: "Ciclo Básico - Materiais", nuclear: "Ciclo Básico - Materiais",
  "minas-petroleo": "Ciclo Básico - Minas", minas: "Ciclo Básico - Minas", petroleo: "Ciclo Básico - Minas",
};

/* ---------- DWR: corpo da chamada e leitor da resposta (traduzidos do usp-mcp) ---------- */

function serializar(metodo, consulta, params) {
  const linhas = ["callCount=1", "windowName=", "c0-scriptName=ControlePublicoDWR", `c0-methodName=${metodo}`, "c0-id=0",
    `c0-param0=string:${encodeURIComponent(consulta)}`];
  const refs = [];
  Object.entries(params).forEach(([chave, valor], i) => {
    const rot = `c0-e${i + 1}`;
    linhas.push(typeof valor === "number" ? `${rot}=number:${valor}` : `${rot}=string:${encodeURIComponent(String(valor))}`);
    refs.push(`${chave}:reference:${rot}`);
  });
  linhas.push(`c0-param1=Object_Object:{${refs.join(", ")}}`, "batchId=0", "instanceId=0", "page=%2Fjupiterweb%2FjupCarreira.jsp", "scriptSessionId=0000000000000000");
  return linhas.join("\n");
}

class ErroJupiter extends Error {}

// A resposta é um literal JavaScript (chaves sem aspas) dentro de um envelope: não é JSON e não deve
// ser executada. Este leitor percorre o texto sem rodar nada, distinguindo o que é string do que é estrutura.
function decodificar(corpo) {
  if (!corpo.includes("//#DWR-END#")) throw new Error("resposta do JupiterWeb sem o marcador de fim (truncada ou não é DWR)");
  const m = /handle(Callback|Exception)\("[^"]*","[^"]*",/.exec(corpo);
  if (!m) throw new Error("resposta sem handleCallback nem handleException");
  let i = m.index + m[0].length;
  const t = corpo;
  const espaco = () => { while (i < t.length && " \t\r\n".includes(t[i])) i++; };
  const ESC = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
  function texto() {
    i++; let s = "";
    for (;;) {
      const c = t[i];
      if (c === undefined) throw new Error("string sem fechamento");
      if (c === '"') { i++; return s; }
      if (c !== "\\") { s += c; i++; continue; }
      const f = t[i + 1];
      if (f === "u") { s += String.fromCharCode(parseInt(t.slice(i + 2, i + 6), 16)); i += 6; }
      else if (f in ESC) { s += ESC[f]; i += 2; }
      else throw new Error(`escape desconhecido \\${f}`);
    }
  }
  function valor() {
    espaco();
    const c = t[i];
    if (c === "{") {
      i++; const o = {}; espaco();
      if (t[i] === "}") { i++; return o; }
      for (;;) {
        espaco();
        let chave;
        if (t[i] === '"') chave = texto();
        else { const ini = i; while (i < t.length && /[\w$]/.test(t[i])) i++; chave = t.slice(ini, i); if (!chave) throw new Error("esperava uma chave"); }
        espaco(); if (t[i] !== ":") throw new Error("esperava ':'"); i++;
        o[chave] = valor(); espaco();
        const s = t[i++]; if (s === "}") return o; if (s !== ",") throw new Error("esperava ',' ou '}'");
      }
    }
    if (c === "[") {
      i++; const l = []; espaco();
      if (t[i] === "]") { i++; return l; }
      for (;;) { l.push(valor()); espaco(); const s = t[i++]; if (s === "]") return l; if (s !== ",") throw new Error("esperava ',' ou ']'"); }
    }
    if (c === '"') return texto();
    for (const [nome, v] of [["null", null], ["true", true], ["false", false]]) if (t.startsWith(nome, i)) { i += nome.length; return v; }
    const ini = i; while (i < t.length && "-+.eE0123456789".includes(t[i])) i++;
    if (ini === i) throw new Error("valor ilegível na resposta");
    return Number(t.slice(ini, i));
  }
  const v = valor();
  if (m[1] === "Exception") throw new ErroJupiter((v && (v.localizedMessage || v.message)) || "o JupiterWeb recusou o pedido");
  return v;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
let pedidos = 0;
async function chamar(metodo, consulta, params) {
  if (pedidos++) await espera(PAUSA);
  const r = await fetch(`${URL_DWR}.${metodo}.dwr`, {
    method: "POST", body: serializar(metodo, consulta, params),
    headers: { "Content-Type": "text/plain", "User-Agent": AGENTE }, signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`${consulta}: HTTP ${r.status}`);
  return decodificar(new TextDecoder("iso-8859-1").decode(await r.arrayBuffer()));
}

/* ---------- o que já temos ---------- */

const limpa = (s) => String(s ?? "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
const ler = (arq) => { try { return JSON.parse(readFileSync(arq, "utf8")); } catch { return null; } };
const agora = Date.now();
const indice = ler(indiceArq) || { cursos: {}, indice: {} };
mkdirSync(pastaFichas, { recursive: true });
const fichas = {};
for (const f of readdirSync(pastaFichas)) if (f.endsWith(".json")) fichas[f.slice(0, -5)] = ler(pastaFichas + f);

try {
  /* ---------- grades: o primeiro semestre de cada curso (uma vez por mês) ---------- */
  if (!indice.gradesEm || agora - indice.gradesEm > VALIDADE_GRADE || process.env.JUPITER_GRADES) {
    const entrada = await chamar("listar", "pubListarCursoEntrada", { codclg: "3" });   // 3 = Escola Politécnica
    const grades = {};
    const cursos = {};
    for (const [id, trecho] of Object.entries(CURSOS)) {
      const c = entrada.find((x) => x.nomhab.includes(trecho));
      if (!c) { console.warn(`Curso não encontrado no JupiterWeb: ${id} (${trecho})`); continue; }
      const chave = `${c.codcur}|${c.codhab}`;
      grades[chave] ??= await chamar("listar", "pubGradeCurricular", { codcur: c.codcur, codhab: c.codhab, tipo: "N" });
      // as obrigatórias do 1º semestre, as optativas do mesmo semestre (onde aparecem trilhas novas, como a
      // dos módulos da Elétrica) e até que semestre vai a grade pública (a da Poli costuma parar no 5º)
      const doSemestre1 = (tipo) => grades[chave].filter((d) => String(d.numsemidl) === "1" && d.tipobg === tipo)
        .map((d) => [d.coddis, limpa(d.nomdis), +d.creaul || 0, +d.cretrb || 0])
        .sort((a, b) => a[1].localeCompare(b[1], "pt"));
      const semestres = Math.max(0, ...grades[chave].map((d) => +d.numsemidl || 0));
      // a grade inteira, por semestre ideal: [sigla, nome, créditos-aula, créditos-trabalho, tipo] com tipo
      // "O" obrigatória, "L" optativa eletiva e "V" optativa livre (usada pela conferência do 1º ano e pelo
      // robô das turmas, ferramentas/turmas.mjs)
      const grade = {};
      for (const d of grades[chave]) {
        const s = String(+d.numsemidl || 0);
        if (s === "0") continue;
        (grade[s] ??= []).push([d.coddis, limpa(d.nomdis), +d.creaul || 0, +d.cretrb || 0, d.tipobg]);
      }
      for (const s in grade) grade[s].sort((a, b) => a[4].localeCompare(b[4]) || a[1].localeCompare(b[1], "pt"));
      cursos[id] = { codcur: c.codcur, codhab: c.codhab, habilitacao: limpa(c.nomhab), primeiro: doSemestre1("O"), optativas: doSemestre1("L"), semestres, grade };
    }
    indice.cursos = cursos;
    indice.gradesEm = agora;
  }

  /* ---------- fichas: 1º semestre de todos os cursos + as disciplinas que estão no USPolis ---------- */
  const salas = ler(salasArq);
  const precisa = new Set([...Object.values(indice.cursos).flatMap((c) => c.primeiro.map((d) => d[0])), ...Object.keys(salas?.disciplinas || {})]);
  const vencidas = [...precisa].filter((s) => !fichas[s] || agora - (fichas[s].em || 0) > VALIDADE_FICHA)
    .sort((a, b) => (fichas[a]?.em || 0) - (fichas[b]?.em || 0)).slice(0, LIMITE);
  for (const sigla of vencidas) {
    try {
      const d = await chamar("obter", "pubObterDisciplina", { coddis: sigla, verdis: 0 });
      fichas[sigla] = {
        em: agora, c: sigla, n: limpa(d.nomdis), ca: +d.creaul || 0, ct: +d.cretrb || 0,
        resumo: limpa(d.pgmrsudis), objetivos: limpa(d.objdis), programa: limpa(d.pgmdis),
        avaliacao: limpa(d.dscmtdavl), criterio: limpa(d.crtavl), recuperacao: limpa(d.dscnorrcp), bibliografia: limpa(d.dscbbgdis),
      };
    } catch (erro) {
      if (!(erro instanceof ErroJupiter)) throw erro;
      fichas[sigla] = { em: agora, c: sigla, naoEncontrada: true };   // sigla que o JupiterWeb não conhece: não insiste por um semestre
    }
    writeFileSync(`${pastaFichas}${sigla}.json`, JSON.stringify(fichas[sigla]) + "\n");
  }

  /* ---------- índice leve: nome e créditos de cada sigla com ficha ---------- */
  indice.indice = Object.fromEntries(Object.values(fichas).filter((f) => f && !f.naoEncontrada).sort((a, b) => a.c.localeCompare(b.c)).map((f) => [f.c, [f.n, f.ca, f.ct]]));
  indice.fonte = "JupiterWeb (uspdigital.usp.br/jupiterweb), pelo caminho mapeado pelo usp-mcp de Caio Castro e João Pedro Gunthen";
  indice.atualizadoEm = new Date(agora).toISOString();
  writeFileSync(indiceArq, JSON.stringify(indice) + "\n");
  const faltam = [...precisa].filter((s) => !fichas[s]).length;
  console.log(`disciplinas.json: ${Object.keys(indice.cursos).length} cursos, ${Object.keys(indice.indice).length} fichas (${vencidas.length} buscadas agora, ${faltam} para as próximas execuções), ${pedidos} pedidos ao JupiterWeb.`);
} catch (erro) {
  console.error("JupiterWeb não respondeu como esperado:", erro.message, "Arquivos anteriores mantidos.");
  process.exit(1);
}
