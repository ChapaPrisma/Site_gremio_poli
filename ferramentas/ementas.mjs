// Histórico das ementas das disciplinas da Poli (e das de fora que estão nas grades: MAT, Física, Química...),
// a partir do JupiterWeb. Cada disciplina tem versões numeradas (verdis), cada uma com a data em que entrou em
// vigor e a data em que saiu; as antigas continuam consultáveis, então dá para reconstruir a série inteira
// (há disciplinas com versões desde 1999). Gera:
//   assets/dados/ementas/<SIGLA>.json      todas as versões da disciplina, por extenso, e as edições silenciosas
//   assets/dados/ementas.json              índice: versão atual e datas de cada sigla + registro das mudanças
//   assets/dados/catalogo-disciplinas.json sigla -> nome de todas as disciplinas (a busca do Mapa das disciplinas)
// Lidos pela aba "Ementas" do portal interno (admin/) e por ferramentas/analise-ementas.mjs (análise semestral).
//
// O que conta como mudança (registrada em ementas.json a partir do dia em que o acompanhamento começou):
//   nova-versao     o JupiterWeb passou a ter uma versão nova da disciplina (o departamento reformou a ementa)
//   edicao          a versão vigente mudou de texto sem mudar de número (correção ou ajuste silencioso)
//   nova-disciplina a sigla apareceu no catálogo da Poli
//   saiu            a sigla sumiu do catálogo da Poli (desativada)
//
// Gentileza com a USP: uma requisição por vez, pausa de 1,5 s, no máximo LIMITE pedidos por execução.
// Versões antigas não mudam: são buscadas uma vez só. A versão vigente é conferida a cada VALIDADE dias.
// Caminho até os dados: usp-mcp, de Caio Castro e João Pedro Gunthen (ver ferramentas/jupiter-dwr.mjs).
// Rode com Node 18+: node ferramentas/ementas.mjs (roda sozinho por .github/workflows/jupiter.yml).

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { clienteJupiter, ErroJupiter, limpa } from "./jupiter-dwr.mjs";

const AGENTE = "Site do Gremio Politecnico (historico de ementas; caminho mapeado pelo usp-mcp)";
const LIMITE = Number(process.env.EMENTAS_LIMITE ?? 150);   // pedidos ao JupiterWeb por execução
const VALIDADE = 30;                                        // dias entre duas conferências da versão vigente
const dados = (p) => fileURLToPath(new URL(`../assets/dados/${p}`, import.meta.url));
const pasta = dados("ementas/");
const ler = (arq) => { try { return JSON.parse(readFileSync(arq, "utf8")); } catch { return null; } };
const hoje = new Date().toISOString().slice(0, 10);
const jup = clienteJupiter({ agente: AGENTE, pausa: 1500 });

const CAMPOS = { n: "nomdis", ca: "creaul", ct: "cretrb", resumo: "pgmrsudis", objetivos: "objdis", programa: "pgmdis", avaliacao: "dscmtdavl", criterio: "crtavl", recuperacao: "dscnorrcp", bibliografia: "dscbbgdis" };
const data = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const resumo = (v) => createHash("sha1").update(JSON.stringify(Object.keys(CAMPOS).map((k) => v[k]))).digest("hex").slice(0, 12);
function versao(d) {
  const v = { v: +d.verdis || 0, de: data(d.dtaatvdis), ate: data(d.dtadtvdis) };
  for (const [k, campo] of Object.entries(CAMPOS)) v[k] = k === "ca" || k === "ct" ? +d[campo] || 0 : limpa(d[campo]);
  v.h = resumo(v);
  return v;
}

/* ---------- o que já temos ---------- */
mkdirSync(pasta, { recursive: true });
const ementas = {};
for (const f of readdirSync(pasta)) if (f.endsWith(".json")) ementas[f.slice(0, -5)] = ler(pasta + f);
const indice = ler(dados("ementas.json")) || { inicio: hoje, base: null, disciplinas: {}, mudancas: [] };
const catalogoAnt = ler(dados("catalogo-disciplinas.json"));
const registrar = (m) => { if (indice.base) indice.mudancas.push({ em: hoje, ...m }); };

try {
  /* ---------- catálogo da Poli: sigla, nome e número da versão vigente ---------- */
  // Duas listas públicas do JupiterWeb: tipo=D traz todas as disciplinas ativas da Poli (inclusive as do currículo
  // antigo, EC-3) e tipo=T só as que têm turma no semestre. O catálogo é a primeira; a segunda marca as oferecidas.
  async function lista(tipo) {
    const r = await fetch(`https://uspdigital.usp.br/jupiterweb/jupDisciplinaLista?letra=A-Z&tipo=${tipo}&codcg=3`, { headers: { "User-Agent": AGENTE }, signal: AbortSignal.timeout(90_000) });
    if (!r.ok) throw new Error(`catálogo (${tipo}): HTTP ${r.status}`);
    const html = new TextDecoder("iso-8859-1").decode(await r.arrayBuffer());
    const m = new Map();
    for (const x of html.matchAll(/sgldis=([A-Z0-9]{7})&verdis=(\d+)[^>]*>([^<]+)</g)) m.set(x[1], { v: +x[2], n: limpa(x[3]) });
    return m;
  }
  const catalogo = await lista("D");
  if (catalogo.size < 800) throw new Error(`catálogo com só ${catalogo.size} disciplinas: o JupiterWeb mudou a página?`);
  await new Promise((r) => setTimeout(r, 1500));
  const ofertadas = await lista("T");
  for (const [s, d] of ofertadas) if (!catalogo.has(s)) catalogo.set(s, d);

  // as de fora da Poli que aparecem nas grades, nas turmas e no USPolis
  const fichas = ler(dados("disciplinas.json"));
  const dasGrades = new Set(Object.values(fichas?.cursos || {}).flatMap((c) => Object.values(c.grade || {}).flat().map((d) => d[0])));
  const comTurma = new Set(Object.keys(ler(dados("turmas.json"))?.disciplinas || {}));
  const outras = new Set([
    ...Object.values(fichas?.cursos || {}).flatMap((c) => Object.values(c.grade || {}).flat().map((d) => d[0])),
    ...Object.keys(ler(dados("turmas.json"))?.disciplinas || {}),
    ...Object.keys(ler(dados("salas.json"))?.disciplinas || {}),
  ]);
  const todas = [...new Set([...catalogo.keys(), ...outras, ...Object.keys(ementas)])].filter((s) => /^[A-Z0-9]{7}$/.test(s)).sort();

  // entradas e saídas do catálogo (só depois que o acompanhamento tem base)
  const antes = new Set(Object.entries(indice.disciplinas).filter(([, d]) => d.cat).map(([s]) => s));
  if (antes.size) {
    for (const s of catalogo.keys()) if (!antes.has(s)) registrar({ tipo: "nova-disciplina", c: s, n: catalogo.get(s).n });
    for (const s of antes) if (!catalogo.has(s)) registrar({ tipo: "saiu", c: s, n: indice.disciplinas[s]?.n || "" });
  }

  /* ---------- fila: novas siglas, versões novas, versões antigas que faltam, conferência da vigente ---------- */
  const fila = [];
  for (const s of todas) {
    const e = ementas[s];
    const noCat = catalogo.get(s);
    if (!e) fila.push([0, s, "vigente"]);
    else if (e.naoEncontrada) { if (noCat || daysSince(e.conferidaEm) > 180) fila.push([4, s, "vigente"]); }
    else if (noCat && noCat.v > (e.atual || 0)) fila.push([1, s, "vigente"]);
    else if (daysSince(e.conferidaEm) >= VALIDADE) fila.push([3, s, "vigente", e.conferidaEm]);
    for (const v of e?.faltam || []) fila.push([2, s, v]);
  }
  fila.sort((a, b) => a[0] - b[0] || String(a[3] || "").localeCompare(String(b[3] || "")));

  let falhasSeguidas = 0, interrompida = null;
  for (const [, s, alvo] of fila) {   // a fila cresce durante o laço (versões antigas de uma sigla nova)
    if (jup.pedidos >= LIMITE) break;
    const e = ementas[s] ||= { c: s, versoes: [], edicoes: [], faltam: [] };
    if (alvo !== "vigente" && !e.faltam.includes(alvo)) continue;   // já buscada (entrou duas vezes na fila)
    try {
      if (alvo === "vigente") {
        const v = versao(await jup.chamar("obter", "pubObterDisciplina", { coddis: s, verdis: 0 }));
        delete e.naoEncontrada;
        e.n = v.n; e.conferidaEm = hoje;
        const ja = e.versoes.find((x) => x.v === v.v);
        if (!ja) {
          const conhecida = e.atual != null;
          if (conhecida && v.v > e.atual) {
            registrar({ tipo: "nova-versao", c: s, n: v.n, v: v.v, de: v.de });
            if (!e.faltam.includes(e.atual)) { e.faltam.push(e.atual); fila.push([2, s, e.atual]); }   // a anterior ganhou data de fim: buscar de novo
          }
          e.versoes.push(v);
          // versões anteriores ainda não buscadas (primeira vez que a sigla aparece, ou saltou mais de uma)
          for (let k = 1; k < v.v; k++) if (!e.versoes.some((x) => x.v === k) && !e.faltam.includes(k)) { e.faltam.push(k); fila.push([2, s, k]); }
        } else if (ja.h !== v.h) {
          const campos = Object.keys(CAMPOS).filter((k) => ja[k] !== v[k]);
          e.edicoes.push({ v: v.v, em: hoje, antes: Object.fromEntries(campos.map((k) => [k, ja[k]])) });
          Object.assign(ja, v);
          registrar({ tipo: "edicao", c: s, n: v.n, v: v.v, campos });
        } else Object.assign(ja, { de: v.de, ate: v.ate });
        e.atual = Math.max(e.atual || 0, v.v);
      } else {
        const v = versao(await jup.chamar("obter", "pubObterDisciplina", { coddis: s, verdis: alvo }));
        const i = e.versoes.findIndex((x) => x.v === alvo);
        if (i >= 0) e.versoes[i] = v; else e.versoes.push(v);
        e.faltam = e.faltam.filter((k) => k !== alvo);
      }
      falhasSeguidas = 0;
    } catch (erro) {
      if (!(erro instanceof ErroJupiter)) {
        // queda de rede ou JupiterWeb fora do ar: espera e segue; três seguidas, para por hoje sem perder nada
        console.warn(`${s} (${alvo}): ${erro.message}`);
        if (++falhasSeguidas >= 3) { interrompida = erro.message; break; }
        await new Promise((r) => setTimeout(r, 15_000));
        continue;
      }
      falhasSeguidas = 0;
      if (alvo === "vigente") { e.naoEncontrada = true; e.conferidaEm = hoje; }
      else { e.faltam = e.faltam.filter((k) => k !== alvo); (e.inexistentes ||= []).includes(alvo) || e.inexistentes.push(alvo); }
    }
    e.versoes.sort((a, b) => a.v - b.v);
    writeFileSync(`${pasta}${s}.json`, JSON.stringify(e) + "\n");   // grava na hora: uma execução interrompida não perde nada
  }

  /* ---------- índice e catálogo ---------- */
  for (const s of todas) {
    const e = ementas[s];
    if (!e || e.naoEncontrada) continue;
    const vig = e.versoes.find((x) => x.v === e.atual);
    indice.disciplinas[s] = { n: e.n, atual: e.atual, de: vig?.de || null, versoes: e.versoes.length, primeira: e.versoes[0]?.de || null, edicoes: e.edicoes.length, cat: catalogo.has(s) ? 1 : 0, faltam: e.faltam.length };
  }
  const completo = todas.every((s) => ementas[s] && (ementas[s].naoEncontrada || !ementas[s].faltam.length));
  if (!indice.base && completo) indice.base = hoje;   // a partir daqui, mudança vista vira registro
  indice.mudancas = indice.mudancas.slice(-2000);
  indice.atualizadoEm = new Date().toISOString();
  indice.fonte = "JupiterWeb (uspdigital.usp.br/jupiterweb), pelo caminho mapeado pelo usp-mcp de Caio Castro e João Pedro Gunthen";
  writeFileSync(dados("ementas.json"), JSON.stringify(indice) + "\n");

  // sigla -> [nome, créditos-aula, créditos-trabalho, vigente desde, número de versões, primeira versão desde, oferecida]
  const antigo = (s) => { const v = catalogoAnt?.d?.[s]; return Array.isArray(v) ? v[0] : v; };
  const linhas = todas.map((s) => {
    const e = ementas[s], vig = e?.versoes?.find((x) => x.v === e.atual);
    const n = e?.n || catalogo.get(s)?.n || antigo(s) || fichas?.indice?.[s]?.[0] || "";
    const oferecida = ofertadas.has(s) || comTurma.has(s) || dasGrades.has(s) ? 1 : 0;
    return n && [s, [n, vig?.ca ?? 0, vig?.ct ?? 0, vig?.de || null, e?.versoes?.length || 0, e?.versoes?.[0]?.de || null, oferecida]];
  }).filter(Boolean);
  writeFileSync(dados("catalogo-disciplinas.json"), JSON.stringify({
    fonte: "JupiterWeb: catálogo das disciplinas da Escola Politécnica e as de outras unidades que estão nas grades da Poli",
    atualizadoEm: indice.atualizadoEm,
    campos: ["nome", "créditos-aula", "créditos-trabalho", "ementa vigente desde", "versões da ementa", "primeira versão desde", "oferecida agora (turma no JupiterWeb ou na grade de um curso)"],
    d: Object.fromEntries(linhas),
  }) + "\n");

  const faltam = Object.values(ementas).reduce((n, e) => n + (e.faltam?.length || 0), 0) + todas.filter((s) => !ementas[s]).length;
  console.log(`ementas: ${Object.keys(indice.disciplinas).length} disciplinas acompanhadas (${catalogo.size} no catálogo da Poli, ${ofertadas.size} com turma), ${jup.pedidos} pedidos ao JupiterWeb, ${faltam} pedidos na fila para as próximas execuções${indice.base ? `; mudanças registradas desde ${indice.base}: ${indice.mudancas.length}` : "; ainda carregando o histórico"}.`);
  if (interrompida) console.log(`::warning::JupiterWeb parou de responder (${interrompida}); o resto fica para a próxima execução.`);
} catch (erro) {
  // rede fora do ar não é defeito do robô: avisa e tenta de novo amanhã, sem marcar a execução como falha
  if (/fetch failed|ECONN|ETIMEDOUT|ENOTFOUND|timeout|aborted|HTTP 5\d\d/i.test(erro.message)) {
    console.log(`::warning::JupiterWeb fora do ar (${erro.message}). O que já tinha sido buscado foi guardado; tenta de novo amanhã.`);
    process.exit(0);
  }
  console.error("JupiterWeb não respondeu como esperado:", erro.message, "O que já tinha sido buscado foi guardado.");
  process.exit(1);
}

function daysSince(iso) { return iso ? (Date.parse(hoje) - Date.parse(iso)) / 864e5 : Infinity; }
