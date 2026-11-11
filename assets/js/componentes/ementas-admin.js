// Aba "Ementas" do portal interno (admin/#ementas), discreta de propósito: o histórico das ementas das
// disciplinas no JupiterWeb, as mudanças que o robô registrou (ferramentas/ementas.mjs) e a análise de cada
// semestre (ferramentas/analise-ementas.mjs), com a série histórica inteira. Para uma disciplina: a linha do
// tempo das versões e a comparação palavra a palavra entre duas delas. Chamada depois do login.

import { ligarBusca } from "./busca-disciplina.js?v=202611102102";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "");
const TIPO = { "nova-versao": "Versão nova", edicao: "Texto editado sem trocar de versão", "nova-disciplina": "Entrou no catálogo", saiu: "Saiu do catálogo" };
const CLASSE = { "mais-exigente": "mais exigente", "mais-leve": "mais leve", enfase: "mudou de ênfase", ajuste: "ajuste", igual: "texto igual" };
const CAMPOS = { n: "Nome", resumo: "Resumo", objetivos: "Objetivos", programa: "Programa", avaliacao: "Método de avaliação", criterio: "Critério", recuperacao: "Recuperação", bibliografia: "Bibliografia" };

export async function ementasAdmin(url) {
  const painel = document.getElementById("painelEmentas");
  if (!painel || painel.dataset.pronto) return;
  painel.dataset.pronto = "1";
  const pegar = (p) => fetch(url(p), { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [indice, analises, cat] = await Promise.all([pegar("assets/dados/ementas.json"), pegar("assets/dados/ementas-analises/indice.json"), pegar("assets/dados/catalogo-disciplinas.json")]);
  if (!indice) { painel.innerHTML = `<p class="nota">O histórico das ementas ainda não foi gerado (ferramentas/ementas.mjs).</p>`; return; }
  const ds = Object.values(indice.disciplinas);
  const versoes = ds.reduce((s, d) => s + d.versoes, 0);
  const desde = ds.map((d) => d.primeira).filter(Boolean).sort()[0];
  const mud = [...(indice.mudancas || [])].reverse();
  painel.innerHTML = `<div class="em-admin">
    <p class="em-admin__resumo">${ds.length} disciplinas acompanhadas, com ${versoes} versões de ementa guardadas (a mais antiga de ${desde?.slice(0, 4) || "?"}). ${indice.base ? `Mudanças registradas desde ${dataBR(indice.base)}.` : "O histórico ainda está sendo carregado."} Atualizado em ${dataBR(indice.atualizadoEm)}.</p>
    <section aria-labelledby="emMudTit">
      <h3 id="emMudTit">Mudanças registradas</h3>
      ${mud.length ? `<ul class="em-mudancas">${mud.slice(0, 40).map((m) => `<li data-tipo="${esc(m.tipo)}"><b>${esc(m.c)}</b> ${esc(m.n)} <small>· ${esc(TIPO[m.tipo] || m.tipo)}${m.v ? ` (versão ${m.v}${m.de ? `, em vigor desde ${dataBR(m.de)}` : ""})` : ""}${m.campos?.length ? `: ${esc(m.campos.map((c) => CAMPOS[c] || c).join(", ").toLowerCase())}` : ""} · visto em ${dataBR(m.em)}</small> <button type="button" class="chip" data-ver="${esc(m.c)}" style="padding:1px 10px;font-size:.78rem">Ver</button></li>`).join("")}</ul>${mud.length > 40 ? `<p class="nota">E mais ${mud.length - 40} mudanças antigas.</p>` : ""}`
        : `<p class="nota">Nenhuma mudança desde o início do acompanhamento${indice.base ? ` (${dataBR(indice.base)})` : ""}. O robô confere cada ementa uma vez por mês e o catálogo todo dia.</p>`}
    </section>
    <section aria-labelledby="emAnTit">
      <h3 id="emAnTit">Análise do semestre</h3>
      ${analises?.length ? `<label class="em-comparar" style="margin-top:6px">Semestre <select id="emPeriodo">${[...analises].reverse().map((a) => `<option value="${esc(a.periodo)}">${esc(a.rotulo)}</option>`).join("")}</select></label><div id="emAnalise"><p class="nota">Carregando…</p></div>`
        : `<p class="nota">A primeira análise sai no próximo 1º de março ou 1º de agosto (ferramentas/analise-ementas.mjs).</p>`}
    </section>
    <section aria-labelledby="emDiscTit">
      <h3 id="emDiscTit">Uma disciplina</h3>
      <div class="em-busca"><input type="text" id="emBusca" placeholder="Código ou nome da disciplina" aria-label="Disciplina"></div>
      <div id="emDisc"></div>
    </section>
  </div>`;

  const nomes = Object.fromEntries(Object.entries(cat?.d || {}).map(([s, v]) => [s, Array.isArray(v) ? v[0] : v]).filter(([s]) => indice.disciplinas[s]));
  const busca = ligarBusca(painel.querySelector("#emBusca"), nomes, { aoEscolher: (c) => c && disciplina(c) });
  painel.addEventListener("click", (e) => { const b = e.target.closest("[data-ver]"); if (b) { busca.escolher(b.dataset.ver, false); disciplina(b.dataset.ver); painel.querySelector("#emDisc").scrollIntoView({ block: "nearest" }); } });

  async function mostrarAnalise(periodo) {
    const caixa = painel.querySelector("#emAnalise");
    const a = await pegar(`assets/dados/ementas-analises/${periodo}.json`);
    if (!a) { caixa.innerHTML = `<p class="nota">Não deu para abrir esta análise.</p>`; return; }
    const serie = a.serie.filter((s) => s.emVigor >= 30 || s.versoesNovas + s.novasDisciplinas > 0);
    const anosTab = [...new Set([serie[0]?.ano, 2000, 2005, 2010, 2015, 2018, 2020, 2022, serie.at(-1)?.ano])].filter((x) => serie.some((s) => s.ano === x)).sort((x, y) => x - y);
    const linhaMud = (m) => `<li><b>${esc(m.c)}</b> ${esc(m.n)} <small>· versão ${m.deV} → ${m.paraV}, em vigor desde ${dataBR(m.de)} · <b>${esc(CLASSE[m.classe])}</b>${m.sinais.length ? `: ${esc(m.sinais.join("; "))}` : ""}${m.ganhou.length ? ` · ganhou peso: ${esc(m.ganhou.map((t) => a.temas[t]).join(", "))}` : ""}${m.perdeu.length ? ` · perdeu peso: ${esc(m.perdeu.map((t) => a.temas[t]).join(", "))}` : ""}${m.entraram.length && m.classe !== "igual" ? ` · palavras novas: ${esc(m.entraram.slice(0, 6).join(", "))}` : ""}</small> <button type="button" class="chip" data-ver="${esc(m.c)}" style="padding:1px 10px;font-size:.78rem">Ver</button></li>`;
    caixa.innerHTML = `<div class="em-analise">
      ${a.texto.map((p) => `<p>${esc(p)}</p>`).join("")}
      <div class="em-graficos">
        ${grafico("Ementas novas por ano", "Versões novas e disciplinas criadas, pela data em que entraram em vigor.", serie, (s) => s.versoesNovas + s.novasDisciplinas, "barras", (v) => `${v} ementa${v === 1 ? "" : "s"} nova${v === 1 ? "" : "s"}`)}
        ${grafico("Ano mediano da bibliografia", "Nas ementas em vigor em 1º de julho de cada ano.", serie.filter((s) => s.bibAno && s.emVigor >= 30), (s) => s.bibAno, "linha", (v) => `bibliografia mediana de ${v}`)}
        ${grafico("Tamanho do programa", "Mediana de palavras do resumo e do programa, nas ementas em vigor.", serie.filter((s) => s.emVigor >= 30), (s) => s.palavras, "linha", (v) => `${v} palavras`)}
        ${grafico("Com recuperação prevista", "Parte das ementas em vigor que prevê recuperação.", serie.filter((s) => s.emVigor >= 30), (s) => Math.round(s.comRecuperacao * 100), "linha", (v) => `${v}% com recuperação`, "%")}
      </div>
      <details style="margin-top:14px"><summary>Peso de cada tema nas ementas em vigor (tabela)</summary>
        <table class="em-tabela"><thead><tr><th>Tema</th>${anosTab.map((x) => `<th class="num">${x}</th>`).join("")}</tr></thead><tbody>
        ${Object.entries(a.temas).map(([k, nome]) => `<tr><td>${esc(nome)}</td>${anosTab.map((x) => { const s = serie.find((y) => y.ano === x); return `<td class="num">${s?.temas?.[k] != null ? `${Math.round(s.temas[k] * 100)}%` : "?"}</td>`; }).join("")}</tr>`).join("")}
        <tr><td>Ementas em vigor</td>${anosTab.map((x) => `<td class="num">${serie.find((y) => y.ano === x)?.emVigor ?? "?"}</td>`).join("")}</tr>
        </tbody></table></details>
      ${a.semestre.length ? `<h4 style="margin-top:16px">As trocas de versão do semestre</h4><ul class="em-mudancas">${a.semestre.map(linhaMud).join("")}</ul>` : ""}
      ${a.maisMarcadas?.length ? `<details style="margin-top:12px"><summary>As mudanças mais marcadas dos últimos dois anos</summary><ul class="em-mudancas">${a.maisMarcadas.map(linhaMud).join("")}</ul></details>` : ""}
      <details class="em-analise__metodo"><summary>Como esta análise é feita</summary>${a.metodo.map((p) => `<p>${esc(p)}</p>`).join("")}<p>Gerada em ${dataBR(a.geradaEm)}.</p></details>
    </div>`;
    ligarDicas(caixa);
  }
  if (analises?.length) {
    const sel = painel.querySelector("#emPeriodo");
    sel.addEventListener("change", () => mostrarAnalise(sel.value));
    mostrarAnalise(sel.value);
  }

  async function disciplina(c) {
    const caixa = painel.querySelector("#emDisc");
    caixa.innerHTML = `<p class="nota">Carregando…</p>`;
    const e = await pegar(`assets/dados/ementas/${c}.json`);
    if (!e?.versoes?.length) { caixa.innerHTML = `<p class="nota">Sem histórico para ${esc(c)}.</p>`; return; }
    const vs = [...e.versoes].sort((a, b) => a.v - b.v);
    caixa.innerHTML = `<ul class="em-linha-tempo">${[...vs].reverse().map((v) => `<li class="${v.v === e.atual ? "is-vigente" : ""}"><b>Versão ${v.v}</b> <small>${v.de ? `de ${dataBR(v.de)}` : ""}${v.ate ? ` até ${dataBR(v.ate)}` : v.v === e.atual ? " até hoje (em vigor)" : ""} · ${v.ca + v.ct} crédito${v.ca + v.ct === 1 ? "" : "s"}${v.n !== e.n ? ` · chamava-se ${esc(v.n)}` : ""}</small></li>`).join("")}</ul>
      ${e.edicoes?.length ? `<p class="nota" style="margin-top:8px">Edições sem troca de versão: ${e.edicoes.map((x) => `versão ${x.v} em ${dataBR(x.em)} (${Object.keys(x.antes).map((k) => CAMPOS[k] || k).join(", ").toLowerCase()})`).join("; ")}.</p>` : ""}
      ${vs.length > 1 ? `<div class="em-comparar"><label>De <select id="emDe">${vs.map((v, i) => `<option value="${v.v}"${i === vs.length - 2 ? " selected" : ""}>versão ${v.v} (${v.de?.slice(0, 4) || "?"})</option>`).join("")}</select></label><label>Para <select id="emPara">${vs.map((v, i) => `<option value="${v.v}"${i === vs.length - 1 ? " selected" : ""}>versão ${v.v} (${v.de?.slice(0, 4) || "?"})</option>`).join("")}</select></label></div><div class="em-diff" id="emDiff"></div>`
        : `<p class="nota" style="margin-top:8px">Só uma versão até agora.</p>`}`;
    if (vs.length < 2) return;
    const comparar = () => {
      const a = vs.find((v) => v.v === +caixa.querySelector("#emDe").value), b = vs.find((v) => v.v === +caixa.querySelector("#emPara").value);
      const blocos = Object.entries(CAMPOS).filter(([k]) => (a[k] || "") !== (b[k] || "")).map(([k, nome]) => `<div><h5>${nome}</h5><div class="em-diff__texto">${diferencas(a[k] || "", b[k] || "")}</div></div>`);
      if (a.ca + a.ct !== b.ca + b.ct) blocos.unshift(`<p><b>Créditos:</b> ${a.ca}+${a.ct} → ${b.ca}+${b.ct}</p>`);
      caixa.querySelector("#emDiff").innerHTML = blocos.length ? blocos.join("") : `<p class="nota">O texto das duas versões é igual.</p>`;
    };
    caixa.querySelector("#emDe").addEventListener("change", comparar);
    caixa.querySelector("#emPara").addEventListener("change", comparar);
    comparar();
  }
}

// diferença palavra a palavra (maior subsequência comum): o que saiu riscado, o que entrou destacado
function diferencas(a, b) {
  const pa = a.split(/(\s+)/), pb = b.split(/(\s+)/);
  if (pa.length * pb.length > 4e6) return `<del>${esc(a)}</del>\n\n<ins>${esc(b)}</ins>`;
  const n = pa.length, m = pb.length, t = new Uint16Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i * (m + 1) + j] = pa[i] === pb[j] ? t[(i + 1) * (m + 1) + j + 1] + 1 : Math.max(t[(i + 1) * (m + 1) + j], t[i * (m + 1) + j + 1]);
  let i = 0, j = 0, s = "";
  while (i < n && j < m) {
    if (pa[i] === pb[j]) { s += esc(pa[i]); i++; j++; }
    else if (t[(i + 1) * (m + 1) + j] >= t[i * (m + 1) + j + 1]) { s += `<del>${esc(pa[i])}</del>`; i++; }
    else { s += `<ins>${esc(pb[j])}</ins>`; j++; }
  }
  while (i < n) s += `<del>${esc(pa[i++])}</del>`;
  while (j < m) s += `<ins>${esc(pb[j++])}</ins>`;
  return s.replace(/<\/del><del>/g, "").replace(/<\/ins><ins>/g, "");
}

// gráfico pequeno de uma série só (barras ou linha), em SVG, com dica ao passar o mouse ou tocar
function grafico(titulo, nota, serie, valor, forma, dica, sufixo = "") {
  if (serie.length < 2) return "";
  const W = 360, H = 150, ml = 34, mr = 8, mt = 8, mb = 22;
  const vals = serie.map(valor), anos = serie.map((s) => s.ano);
  let min = forma === "barras" ? 0 : Math.min(...vals), max = Math.max(...vals);
  if (forma !== "barras") { const folga = (max - min) * 0.15 || 1; min = Math.floor(min - folga); max = Math.ceil(max + folga); }
  const x = (i) => ml + (forma === "barras" ? (i + 0.5) * ((W - ml - mr) / serie.length) : (i / (serie.length - 1)) * (W - ml - mr));
  const y = (v) => mt + (1 - (v - min) / (max - min || 1)) * (H - mt - mb);
  const marcas = [min, Math.round((min + max) / 2), max];
  const passoAno = Math.ceil(serie.length / 6);
  const ultimo = anos.length - 1;
  const eixoX = anos.map((a, i) => ((i % passoAno === 0 && i <= ultimo - passoAno * 0.6) || i === ultimo ? `<text class="eixo" x="${x(i)}" y="${H - 6}" text-anchor="middle">${a}</text>` : "")).join("");
  const eixoY = marcas.map((v) => `<line class="grade-linha" x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}"/><text class="eixo" x="${ml - 5}" y="${y(v) + 3}" text-anchor="end">${v}${sufixo}</text>`).join("");
  const largura = Math.max(2, ((W - ml - mr) / serie.length) * 0.7);
  const corpo = forma === "barras"
    ? vals.map((v, i) => `<rect x="${x(i) - largura / 2}" y="${y(v)}" width="${largura}" height="${Math.max(0, y(0) - y(v))}" rx="${Math.min(2, largura / 2)}" fill="var(--azul)"/>`).join("")
    : `<polyline points="${vals.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" fill="none" stroke="var(--azul)" stroke-width="2" stroke-linejoin="round"/>`;
  const alvos = vals.map((v, i) => `<rect x="${x(i) - (W - ml - mr) / serie.length / 2}" y="${mt}" width="${(W - ml - mr) / serie.length}" height="${H - mt - mb}" fill="transparent" data-dica="${esc(`${anos[i]}: ${dica(v)}`)}"/>`).join("");
  return `<figure class="em-grafico"><h4>${esc(titulo)}</h4><p>${esc(nota)}</p><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${titulo}: de ${anos[0]} (${vals[0]}${sufixo}) a ${anos.at(-1)} (${vals.at(-1)}${sufixo}), máximo de ${Math.max(...vals)}${sufixo}`)}">${eixoY}${eixoX}${corpo}${alvos}</svg></figure>`;
}
function ligarDicas(caixa) {
  let d = document.querySelector(".em-dica");
  if (!d) { d = Object.assign(document.createElement("div"), { className: "em-dica", hidden: true }); document.body.appendChild(d); }
  const mostrar = (e) => { const t = e.target.closest?.("[data-dica]"); if (!t) { d.hidden = true; return; } d.textContent = t.dataset.dica; d.hidden = false; d.style.left = `${Math.min(e.clientX + 12, innerWidth - d.offsetWidth - 8)}px`; d.style.top = `${e.clientY - 34}px`; };
  caixa.addEventListener("pointermove", mostrar);
  caixa.addEventListener("pointerdown", mostrar);
  caixa.addEventListener("pointerleave", () => { d.hidden = true; });
}
