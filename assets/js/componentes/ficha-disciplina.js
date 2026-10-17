// Ficha da disciplina (créditos, ementa e avaliação), vinda do JupiterWeb por ferramentas/jupiter.mjs.
// Usada no Guia dos cursos (matérias do 1º semestre), em Salas (Onde é a minha aula?) e no Fuja do Nabo.
// Discreta de propósito: os créditos numa linha pequena e a ficha recolhida num <details>, que só baixa
// assets/dados/disciplinas/<SIGLA>.json quando alguém abre. Nenhuma chamada ao JupiterWeb sai do navegador.
//
// Crédito: o caminho até esses dados no JupiterWeb foi mapeado pelo projeto usp-mcp, de Caio Castro e
// João Pedro Gunthen (github.com/CaioCastro1/mcp-usp).

const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
export const LINK_USP_MCP = "https://github.com/CaioCastro1/mcp-usp";
// a grade curricular pública do curso no JupiterWeb (todos os semestres)
export const linkGrade = (codcur, codhab) => `https://uspdigital.usp.br/jupiterweb/listarGradeCurricular?codcg=3&codcur=${encodeURIComponent(codcur)}&codhab=${encodeURIComponent(codhab)}&tipo=N`;
export const linkJupiter = (sigla) => `https://uspdigital.usp.br/jupiterweb/obterDisciplina?sgldis=${encodeURIComponent(sigla)}`;
export const creditoUspMcp = `Créditos e ementas do JupiterWeb, pelo caminho mapeado pelo <a href="${LINK_USP_MCP}" target="_blank" rel="noopener">usp-mcp</a>, de <span class="nome-credito">Caio Castro</span> e <span class="nome-credito">João Pedro Gunthen</span>.`;

let indice = null;
// O índice leve: { cursos: { id: { primeiro: [[sigla, nome, créditos-aula, créditos-trabalho]] } }, indice: { sigla: [nome, ca, ct] } }
export function carregarIndice(url) {
  indice ??= fetch(url("assets/dados/disciplinas.json")).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return indice;
}

// "4 créditos" ou "4 créditos-aula + 2 créditos-trabalho"
export function textoCreditos(ca, ct) {
  if (!ca && !ct) return "";
  const aula = `${ca} crédito${ca === 1 ? "" : "s"}${ct ? "-aula" : ""}`;
  return ct ? `${aula} + ${ct} crédito${ct === 1 ? "" : "s"}-trabalho` : aula;
}

// o <details> recolhido; o conteúdo entra na primeira vez que alguém abre (ver ligarFichas)
export const detalhes = (sigla) => `<details class="ficha-disc" data-ficha="${esc(sigla)}"><summary>Ementa e avaliação</summary><div class="ficha-disc__corpo"></div></details>`;

const paragrafos = (t) => esc(t).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");

async function preencher(det, url) {
  const corpo = det.querySelector(".ficha-disc__corpo");
  if (corpo.dataset.pronto) return;
  corpo.dataset.pronto = "1";
  const sigla = det.dataset.ficha;
  corpo.innerHTML = `<p class="ficha-disc__nota">Carregando…</p>`;
  let f = null;
  try { const r = await fetch(url(`assets/dados/disciplinas/${encodeURIComponent(sigla)}.json`)); if (r.ok) f = await r.json(); } catch {}
  const fim = `<p class="ficha-disc__fim"><a href="${linkJupiter(sigla)}" target="_blank" rel="noopener">Ficha completa no JupiterWeb</a></p>`;
  if (!f || f.naoEncontrada) { corpo.innerHTML = `<p class="ficha-disc__nota">A ficha desta disciplina ainda não chegou por aqui.</p>${fim}`; return; }
  const blocos = [];
  if (f.resumo) blocos.push(`<h4>Do que trata</h4>${paragrafos(f.resumo)}`);
  const aval = [f.avaliacao, f.criterio].filter(Boolean).join("\n\n");
  if (aval) blocos.push(`<h4>Como é a avaliação</h4>${paragrafos(aval)}`);
  if (f.recuperacao) blocos.push(`<h4>Recuperação</h4>${paragrafos(f.recuperacao)}`);
  if (f.bibliografia) blocos.push(`<details class="ficha-disc__mais"><summary>Bibliografia</summary>${paragrafos(f.bibliografia)}</details>`);
  corpo.innerHTML = blocos.join("") + fim;
}

// Um ouvinte por contêiner: abre e preenche qualquer ficha dentro dele, inclusive as que entram depois.
export function ligarFichas(conteiner, url) {
  conteiner.addEventListener("toggle", (e) => { const d = e.target; if (d.matches?.("details.ficha-disc") && d.open) preencher(d, url); }, true);
}
