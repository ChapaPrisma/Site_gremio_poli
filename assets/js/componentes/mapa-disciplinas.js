// Mapa das disciplinas (aluno/demandas/disciplinas/, dentro de Demandas): um grafo em que cada ponto é uma disciplina, agrupada perto de onde
// ela é dada (o prédio do departamento da Poli, o IME, a Física...). Os grupos ficam na direção real a partir do
// Biênio, com a distância encolhida (dados/unidades-usp.js). Pontos laranja são disciplinas com reclamações:
// quanto mais registros, maior e mais escuro. Ao abrir, as disciplinas saem do Biênio para os seus prédios.
//
// Dados: assets/dados/catalogo-disciplinas.json (ferramentas/ementas.mjs, JupiterWeb), as contagens públicas
// de reclamações (dados/reclamacoes.js, Supabase) e as grades dos cursos (assets/dados/disciplinas.json).
// O texto das reclamações nunca chega ao público: só a gestão lê, no portal interno.

import { lugares, lugarDe } from "../dados/unidades-usp.js?v=202611102102";
import { NATUREZAS, semestres, carregarResumo, enviarReclamacao } from "../dados/reclamacoes.js?v=202611102102";
import { cursos } from "../dados/cursos.js?v=202611102102";
import { ligarBusca } from "./busca-disciplina.js?v=202611102102";
import { carregarIndice, linkJupiter, textoCreditos } from "./ficha-disciplina.js?v=202611102102";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dataBR = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR") : "");
// As cores vêm de tokens.css (--dado-1 a --dado-4: reclamações, do pouco ao muito; --dado-vazio; --tinta...),
// para a troca de identidade ser só lá. Os valores abaixo valem só se a folha de estilo não carregar.
let RAMPA = ["#f0a27e", "#e0672f", "#b5471a", "#7f2f10"], BASE = "#b9b3a8", TINTA = "#0f1f3d", TINTA_SUAVE = "#4a5470", GRUPO = "#b292f5";
function lerCores() {
  const css = getComputedStyle(document.documentElement), v = (n, padrao) => css.getPropertyValue(n).trim() || padrao;
  RAMPA = RAMPA.map((c, i) => v(`--dado-${i + 1}`, c));
  BASE = v("--dado-vazio", BASE); TINTA = v("--tinta", TINTA); TINTA_SUAVE = v("--tinta-suave", TINTA_SUAVE); GRUPO = v("--dado-grupo", GRUPO);
}
// "#rrggbb" com transparência, para o canvas
const comAlfa = (hex, a) => { const n = parseInt(hex.replace("#", ""), 16); return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`; };
const calmo = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export default async function mapaDisciplinas(alvo, { site, url }) {
  lerCores();
  alvo.innerHTML = `<div class="md">
    <div class="md__filtros">
      <div class="md__campo md__campo--busca"><label for="mdBusca">Ache uma disciplina no mapa</label><input id="mdBusca" type="text" placeholder="Ex.: MAT2453 ou cálculo 2"></div>
      <div class="md__campo"><label for="mdCurso">Destacar um curso</label><select id="mdCurso"><option value="">Nenhum</option>${cursos.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("")}</select></div>
    </div>
    <div class="md__naturezas" role="group" aria-label="O que o tamanho dos pontos conta"></div>
    <div class="md__quadro">
      <canvas class="md__tela" role="img" aria-label="Carregando o mapa das disciplinas"></canvas>
      <div class="md__dica" role="presentation" hidden></div>
    </div>
    <div class="md__legenda" aria-hidden="true"></div>
    <p class="md__curso" aria-live="polite" hidden></p>
    <div class="md__detalhe" aria-live="polite"><p class="md__vazio">Toque num ponto (ou procure acima) para ver a disciplina.</p></div>
    <div class="md__ranking">
      <section aria-labelledby="mdRankTit"><h3 id="mdRankTit">Sobre o que mais se reclama</h3><div class="md__barras"></div></section>
      <section aria-labelledby="mdTopTit"><h3 id="mdTopTit">Disciplinas com mais registros</h3><div class="md__top"></div></section>
    </div>
  </div>`;
  const $ = (s) => alvo.querySelector(s);
  const tela = $(".md__tela"), quadro = $(".md__quadro"), dica = $(".md__dica");
  const ctx = tela.getContext("2d");

  /* ---------- dados ---------- */
  const [cat, resumo, indice] = await Promise.all([
    fetch(url("assets/dados/catalogo-disciplinas.json")).then((r) => r.json()).catch(() => ({ d: {} })),
    carregarResumo(site),
    carregarIndice(url),
  ]);
  const info = (s) => { const v = cat.d[s]; return Array.isArray(v) ? v : [v || "", 0, 0, null, 0, null, 1]; };
  const nomes = Object.fromEntries(Object.keys(cat.d).map((s) => [s, info(s)[0]]).filter(([, n]) => n));
  const L = Object.fromEntries(lugares().map((l) => [l.id, l]));
  const rec = resumo.porSigla;
  // no mapa: as oferecidas agora (com turma ou na grade de um curso) e as que têm reclamação; na busca do
  // formulário, todas as ativas (dá para reclamar de uma disciplina que não tem turma neste semestre)
  const nos = Object.keys(nomes).filter((c) => (info(c)[6] ?? 1) || rec.has(c)).map((c) => ({ c, n: nomes[c], lugar: lugarDe(c), cred: info(c)[1] + info(c)[2], x: 0, y: 0, r: 2 }));
  const nomesNoMapa = Object.fromEntries(nos.map((n) => [n.c, n.n]));
  const porSigla = new Map(nos.map((n) => [n.c, n]));
  let medida = "todas", curso = "", escolhida = null, foco = null;
  const conta = (c) => { const r = rec.get(c); return !r ? 0 : medida === "todas" ? r.pessoas : r.por[medida] || 0; };

  // grades dos cursos (a parte pública: do 1º ao 5º semestre, mais ou menos)
  const doCurso = new Set();
  function marcarCurso() {
    doCurso.clear();
    const g = curso && indice?.cursos?.[curso];
    if (g) for (const lista of Object.values(g.grade || {})) for (const d of lista) if (d[4] === "O") doCurso.add(d[0]);
    const p = $(".md__curso");
    if (!g) { p.hidden = true; return; }
    const ali = [...doCurso].filter((s) => porSigla.has(s));
    const porLugar = {};
    for (const s of ali) { const l = porSigla.get(s).lugar; porLugar[l] = (porLugar[l] || 0) + 1; }
    const partes = Object.entries(porLugar).sort((a, b) => b[1] - a[1]).map(([l, k]) => `${k} ${L[l].onde}`);
    const nome = cursos.find((c) => c.id === curso)?.nome || "";
    p.hidden = false;
    p.textContent = ali.length ? `Do 1º ao ${g.semestres}º semestre (a parte da grade que o JupiterWeb mostra), ${nome} tem ${ali.length} obrigatórias: ${partes.join(", ").replace(/, ([^,]*)$/, " e $1")}.` : `A grade de ${nome} ainda não chegou por aqui.`;
  }

  /* ---------- filtros por natureza e ranking ---------- */
  const totais = {};
  for (const r of rec.values()) for (const [k, v] of Object.entries(r.por)) totais[k] = (totais[k] || 0) + v;
  const pessoasTotal = [...rec.values()].reduce((s, r) => s + r.pessoas, 0);
  function desenharFiltros() {
    $(".md__naturezas").innerHTML = [["todas", "Todas as reclamações", pessoasTotal], ...Object.entries(NATUREZAS).map(([k, v]) => [k, v.rotulo, totais[k] || 0])]
      .map(([k, rot, n]) => `<button type="button" class="chip" data-medida="${k}" aria-pressed="${medida === k}">${esc(rot)}${rec.size ? ` <small>${n}</small>` : ""}</button>`).join("");
  }
  function desenharRanking() {
    const lista = Object.entries(totais).sort((a, b) => b[1] - a[1]);
    const max = lista[0]?.[1] || 1;
    $(".md__barras").innerHTML = lista.length
      ? `<ul class="md-barras">${lista.map(([k, n]) => `<li><button type="button" data-medida="${k}" aria-pressed="${medida === k}"><span class="md-barras__rot">${esc(NATUREZAS[k]?.rotulo || k)}</span><span class="md-barras__trilho"><span style="width:${Math.max(2, (n / max) * 100)}%"></span></span><span class="md-barras__n">${n}</span></button></li>`).join("")}</ul>`
      : `<p class="md__vazio">${resumo.ok ? "Ainda não há reclamações registradas. A primeira pode ser a sua, no formulário abaixo." : "As reclamações começam a ser contadas quando o portal abrir."}</p>`;
    const top = [...rec.entries()].filter(([c]) => porSigla.has(c)).map(([c]) => [c, conta(c)]).filter(([, n]) => n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10);
    $(".md__top").innerHTML = top.length
      ? `<ol class="md-top">${top.map(([c, n]) => { const r = rec.get(c); const pior = Object.entries(r.por).sort((a, b) => b[1] - a[1])[0]; return `<li><button type="button" data-sigla="${c}"><b>${c}</b> <span>${esc(nomes[c])}</span><small>${n} registro${n === 1 ? "" : "s"}${pior ? ` · mais sobre ${esc(NATUREZAS[pior[0]]?.rotulo.toLowerCase() || "")}` : ""}</small></button></li>`; }).join("")}</ol>`
      : `<p class="md__vazio">${medida === "todas" ? "Nenhuma disciplina com registros ainda." : "Nenhum registro desta natureza ainda."}</p>`;
  }
  function desenharLegenda() {
    const max = Math.max(0, ...nos.map((n) => conta(n.c)));
    const lim = limites(max);
    const faixas = lim.map((a, i) => { const b = (lim[i + 1] ?? Infinity) - 1; return a === b ? `${a}` : b === Infinity ? `${a} ou mais` : `${a} a ${b}`; });
    $(".md__legenda").innerHTML = `<span><i style="background:${BASE}"></i>sem registro</span>${faixas.map((f, i) => `<span><i style="background:${RAMPA[i]}"></i>${f}</span>`).join("")}${curso ? `<span><i class="anel"></i>obrigatória do curso</span>` : ""}<span class="md__legenda-nota">Cada grupo fica na direção real do prédio, a partir do Biênio, com a distância encolhida.</span>`;
  }
  const limites = (max) => (max <= 8 ? [1, 2, 4, 8] : [1, Math.ceil(max * 0.15), Math.ceil(max * 0.35), Math.ceil(max * 0.65)]);
  let lim = [1, 2, 4, 8];
  const corDe = (m) => { if (!m) return BASE; let i = 0; while (i < 3 && m >= lim[i + 1]) i++; return RAMPA[i]; };

  /* ---------- disposição: grupos na direção real, disciplinas em girassol dentro de cada grupo ---------- */
  let W = 0, H = 0, centro = { x: 0, y: 0 }, grupos = [];
  function raioDe(n, k) { const m = conta(n.c); return (m ? 4.2 + 2.6 * Math.sqrt(m) : 2.1 + Math.min(Math.sqrt(n.cred || 0), 3.5) * 0.5) * k; }
  function dispor(escala = 1) {
    const porLugar = new Map();
    for (const n of nos) { if (!porLugar.has(n.lugar)) porLugar.set(n.lugar, []); porLugar.get(n.lugar).push(n); }
    grupos = [...porLugar.entries()].map(([id, lista]) => {
      for (const n of lista) n.r = Math.min(raioDe(n, escala), 16);
      lista.sort((a, b) => b.r - a.r || a.c.localeCompare(b.c));
      const passo = (lista.reduce((s, n) => s + n.r, 0) / lista.length + 1.4) * 1.05;
      lista.forEach((n, k) => { const a = k * 2.39996, d = passo * Math.sqrt(k + 0.3) * 1.25; n.gx = Math.cos(a) * d; n.gy = Math.sin(a) * d; });
      for (let it = 0; it < 40; it++) {   // tira as sobreposições
        for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
          const a = lista[i], b = lista[j], dx = b.gx - a.gx, dy = b.gy - a.gy, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r + 1.2;
          if (d < min) {   // o maior se mexe menos: as disciplinas com mais reclamações ficam no miolo do grupo
            const f = (min - d) / d, ma = a.r * a.r, mb = b.r * b.r, wa = mb / (ma + mb), wb = ma / (ma + mb);
            a.gx -= dx * f * wa; a.gy -= dy * f * wa; b.gx += dx * f * wb; b.gy += dy * f * wb;
          }
        }
        for (const n of lista) { n.gx *= 0.985; n.gy *= 0.985; }
      }
      const R = Math.max(...lista.map((n) => Math.hypot(n.gx, n.gy) + n.r)) + 5;
      return { id, lugar: L[id], nos: lista, R };
    });
    // o nome de cada grupo (até duas linhas), medido para o arranjo reservar espaço para ele
    const LH = W < 480 ? 12 : 14;
    for (const g of grupos) {
      ctx.font = fonteDe(g);
      g.linhas = quebrar(W < 600 ? g.lugar.curto : g.lugar.nome, Math.max(2 * g.R, W < 480 ? 70 : 100));
      g.lw = Math.max(...g.linhas.map((l) => ctx.measureText(l).width));
      g.lh = g.linhas.length * LH + 4;
      g.rho = Math.max(g.R + g.lh / 2, g.lw / 2 + 6) + 2;   // círculo que cobre o grupo e o nome em cima dele
    }
    // área demais para a tela: encolhe os pontos e refaz
    const area = grupos.reduce((s, g) => s + Math.PI * g.rho ** 2, 0);
    if (area > W * H * 0.5 && escala > 0.4) return dispor(escala * Math.sqrt((W * H * 0.5) / area) * 0.97);
    // Posição de partida: a geográfica, esticada para ocupar o quadro (norte em cima, leste à direita). Quem
    // está fora do campus vai para a borda, na direção real. Depois os grupos se afastam até não se cobrirem.
    const dentro = grupos.filter((g) => !g.lugar.borda);
    const xs = dentro.map((g) => g.lugar.x), ys = dentro.map((g) => g.lugar.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const mx = W * 0.13, mt = H * 0.13 + 16, mb = H * 0.1;
    for (const g of dentro) { g.ax = mx + ((g.lugar.x - x0) / (x1 - x0 || 1)) * (W - 2 * mx); g.ay = mt + ((g.lugar.y - y0) / (y1 - y0 || 1)) * (H - mt - mb); }
    const bie = grupos.find((g) => g.id === "bie") || dentro[0];
    for (const g of grupos.filter((x) => x.lugar.borda)) {
      const dx = g.lugar.x, dy = g.lugar.y, n = Math.hypot(dx, dy) || 1;
      const lim = (v, a, b) => Math.max(a, Math.min(b, v));
      const t = Math.min(...[dx > 0 ? (W - g.rho - 6 - bie.ax) / (dx / n) : dx < 0 ? (g.rho + 6 - bie.ax) / (dx / n) : Infinity, dy > 0 ? (H - g.rho - 6 - bie.ay) / (dy / n) : dy < 0 ? (g.rho + 6 - bie.ay) / (dy / n) : Infinity]);
      g.ax = lim(bie.ax + (dx / n) * t, g.rho + 6, W - g.rho - 6); g.ay = lim(bie.ay + (dy / n) * t, g.rho + 6, H - g.rho - 6);
    }
    for (const g of grupos) { g.x = g.ax; g.y = g.ay; }
    for (let it = 0; it < 400; it++) {
      for (let i = 0; i < grupos.length; i++) for (let j = i + 1; j < grupos.length; j++) {
        const a = grupos[i], b = grupos[j];
        const dx = b.x - a.x, dy = (b.y - b.lh / 2) - (a.y - a.lh / 2), d = Math.hypot(dx, dy) || 0.01, min = a.rho + b.rho + 4;
        if (d < min) {
          const f = (min - d) / d / 2;
          const pa = a === bie ? 0.25 : 1, pb = b === bie ? 0.25 : 1;   // o Biênio é a referência: quase não sai do lugar
          a.x -= dx * f * pa; a.y -= dy * f * pa; b.x += dx * f * pb; b.y += dy * f * pb;
        }
      }
      for (const g of grupos) {
        g.x += (g.ax - g.x) * 0.03; g.y += (g.ay - g.y) * 0.03;
        const meiaL = Math.max(g.R, g.lw / 2) + 4;
        g.x = Math.max(meiaL, Math.min(W - meiaL, g.x)); g.y = Math.max(g.R + g.lh + 4, Math.min(H - g.R - 4, g.y));
      }
    }
    centro = { x: bie.x, y: bie.y };
    for (const g of grupos) for (const n of g.nos) { n.tx = g.x + n.gx; n.ty = g.y + n.gy; }
  }
  const fonteDe = (g) => `${g.lugar.poli ? 800 : 700} ${W < 480 ? 10.5 : 12}px Nunito, system-ui, sans-serif`;
  function quebrar(texto, max) {
    const palavras = texto.split(" "), linhas = [];
    let atual = "";
    for (const p of palavras) {
      const tenta = atual ? `${atual} ${p}` : p;
      if (atual && ctx.measureText(tenta).width > max) { linhas.push(atual); atual = p; } else atual = tenta;
    }
    if (atual) linhas.push(atual);
    return linhas;
  }

  /* ---------- desenho ---------- */
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  function medir() {
    W = quadro.clientWidth;
    H = Math.round(W < 560 ? Math.max(480, W * 1.3) : Math.min(660, Math.max(460, W * 0.66)));
    tela.width = W * dpr; tela.height = H * dpr; tela.style.height = `${H}px`;
  }
  function desenhar() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = "700 11px Nunito, system-ui, sans-serif"; ctx.fillStyle = TINTA_SUAVE; ctx.textAlign = "center";
    ctx.fillText("N", W - 18, 20); ctx.beginPath(); ctx.moveTo(W - 18, 24); ctx.lineTo(W - 18, 38); ctx.strokeStyle = TINTA_SUAVE; ctx.lineWidth = 1.5; ctx.stroke();
    const temCurso = doCurso.size > 0;
    for (const g of grupos) {
      const destaque = escolhida && porSigla.get(escolhida)?.lugar === g.id;
      ctx.beginPath(); ctx.arc(g.x, g.y, g.R, 0, Math.PI * 2);
      ctx.fillStyle = g.lugar.poli ? comAlfa(GRUPO, 0.13) : comAlfa(TINTA, 0.045); ctx.fill();
      if (destaque) { ctx.strokeStyle = comAlfa(TINTA, 0.35); ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    for (const n of nos) {
      const m = conta(n.c), apagado = temCurso && !doCurso.has(n.c);
      ctx.globalAlpha = apagado ? 0.22 : 1;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (n === foco ? 1.35 : 1), 0, Math.PI * 2);
      ctx.fillStyle = m ? corDe(m) : temCurso && !apagado ? TINTA : BASE; ctx.fill();
      if (m && !apagado) { ctx.lineWidth = 1.5; ctx.strokeStyle = "#fff"; ctx.stroke(); }
      if (temCurso && !apagado && m) { ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 2.2, 0, Math.PI * 2); ctx.strokeStyle = TINTA; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    ctx.globalAlpha = 1;
    // nomes dos grupos, em cima de cada um, com um contorno da cor do papel para ler sobre os pontos
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.lineJoin = "round";
    const LH = W < 480 ? 12 : 14;
    for (const g of grupos) {
      ctx.font = fonteDe(g);
      g.linhas.forEach((l, i) => {
        const y = g.y - g.R - 5 - (g.linhas.length - 1 - i) * LH;
        ctx.strokeStyle = "rgba(255,255,255,.92)"; ctx.lineWidth = 4; ctx.strokeText(l, g.x, y);
        ctx.fillStyle = g.lugar.poli ? TINTA : TINTA_SUAVE; ctx.fillText(l, g.x, y);
      });
    }
    // a escolhida: anel e a sigla ao lado
    const e = escolhida && porSigla.get(escolhida);
    if (e) {
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2); ctx.strokeStyle = TINTA; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.font = "800 12px Nunito, system-ui, sans-serif"; ctx.textAlign = e.x > W - 90 ? "right" : "left";
      const tx = e.x + (ctx.textAlign === "left" ? e.r + 8 : -e.r - 8);
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 4; ctx.strokeText(e.c, tx, e.y + 4); ctx.fillStyle = TINTA; ctx.fillText(e.c, tx, e.y + 4);
    }
  }

  // as disciplinas saem do Biênio e vão para os seus prédios (uma vez, quando o mapa aparece na tela)
  let quadroAnim = 0;
  function animar(deOnde, dur = 1500) {
    cancelAnimationFrame(quadroAnim);
    if (calmo()) { for (const n of nos) { n.x = n.tx; n.y = n.ty; } desenhar(); return; }
    const t0 = performance.now(), maxD = Math.max(...nos.map((n) => Math.hypot(n.tx - centro.x, n.ty - centro.y)), 1);
    for (const n of nos) { n.sx = deOnde ? deOnde.x + (Math.random() - 0.5) * 8 : n.x; n.sy = deOnde ? deOnde.y + (Math.random() - 0.5) * 8 : n.y; n.atraso = deOnde ? (Math.hypot(n.tx - centro.x, n.ty - centro.y) / maxD) * dur * 0.45 : 0; }
    const passo = (t) => {
      let falta = false;
      for (const n of nos) {
        const p = Math.min(1, Math.max(0, (t - t0 - n.atraso) / (dur * 0.55)));
        const e = 1 - (1 - p) ** 3;
        n.x = n.sx + (n.tx - n.sx) * e; n.y = n.sy + (n.ty - n.sy) * e;
        if (p < 1) falta = true;
      }
      desenhar();
      if (falta) quadroAnim = requestAnimationFrame(passo);
    };
    quadroAnim = requestAnimationFrame(passo);
  }

  function refazer(comAnimacao) {
    lim = limites(Math.max(0, ...nos.map((n) => conta(n.c))));
    dispor();
    if (comAnimacao) animar(null, 700); else { for (const n of nos) { n.x = n.tx; n.y = n.ty; } desenhar(); }
  }

  /* ---------- toque, mouse e detalhe ---------- */
  function noPerto(ev) {
    const b = tela.getBoundingClientRect(), x = ev.clientX - b.left, y = ev.clientY - b.top;
    let melhor = null, dm = Infinity;
    for (const n of nos) { const d = Math.hypot(n.x - x, n.y - y) - n.r; if (d < dm) { dm = d; melhor = n; } }
    const dedo = ev.pointerType === "touch" || (!ev.pointerType && matchMedia("(pointer: coarse)").matches);
    return dm <= (dedo ? 14 : 8) ? melhor : null;
  }
  tela.addEventListener("pointermove", (ev) => {
    if (ev.pointerType === "touch") return;
    const n = noPerto(ev);
    if (n !== foco) { foco = n; desenhar(); }
    tela.style.cursor = n ? "pointer" : "default";
    if (!n) { dica.hidden = true; return; }
    const m = conta(n.c);
    dica.innerHTML = `<b>${n.c}</b> ${esc(n.n)}<small>${m ? `${m} registro${m === 1 ? "" : "s"}` : "sem registro"} · ${esc(L[n.lugar].nome)}</small>`;
    dica.hidden = false;
    const b = tela.getBoundingClientRect();
    dica.style.left = `${Math.min(ev.clientX - b.left + 14, W - dica.offsetWidth - 6)}px`;
    dica.style.top = `${Math.max(6, ev.clientY - b.top - dica.offsetHeight - 10)}px`;
  });
  tela.addEventListener("pointerleave", () => { foco = null; dica.hidden = true; desenhar(); });
  tela.addEventListener("click", (ev) => { const n = noPerto(ev); if (n) escolher(n.c); });

  function escolher(c, rolar = false) {
    escolhida = porSigla.has(c) ? c : null;
    busca.escolher(escolhida, false);
    desenhar();
    const caixa = $(".md__detalhe");
    if (!escolhida) { caixa.innerHTML = `<p class="md__vazio">Toque num ponto (ou procure acima) para ver a disciplina.</p>`; return; }
    const [n, ca, ct, desde, versoes, primeira] = info(c);
    const r = rec.get(c), lugar = L[porSigla.get(c).lugar];
    const linhas = r ? Object.entries(r.por).sort((a, b) => b[1] - a[1]) : [];
    const max = linhas[0]?.[1] || 1;
    caixa.innerHTML = `<article class="md-ficha">
      <p class="md-ficha__lugar">${esc(lugar.extenso)}</p>
      <h3><b>${c}</b> ${esc(n)}</h3>
      <p class="md-ficha__meta">${[textoCreditos(ca, ct), desde ? `ementa em vigor desde ${dataBR(desde)}` : "", versoes > 1 ? `${versoes} versões da ementa desde ${primeira?.slice(0, 4)}` : ""].filter(Boolean).join("; ")}</p>
      ${r ? `<p><b>${r.pessoas} pessoa${r.pessoas === 1 ? "" : "s"}</b> ${r.pessoas === 1 ? "reclamou" : "reclamaram"} desta disciplina (a última em ${dataBR(r.ultima)}). Sobre o quê:</p>
        <ul class="md-barras md-barras--ficha">${linhas.map(([k, v]) => `<li><span class="md-barras__rot">${esc(NATUREZAS[k]?.rotulo || k)}</span><span class="md-barras__trilho"><span style="width:${(v / max) * 100}%"></span></span><span class="md-barras__n">${v}</span></li>`).join("")}</ul>`
        : `<p>Ninguém reclamou desta disciplina por aqui ainda.</p>`}
      <div class="md-ficha__acoes"><a class="botao botao--pequeno" href="#comentar" data-comentar="${c}">Comentar esta disciplina</a><a class="md-ficha__jw" href="${linkJupiter(c)}" target="_blank" rel="noopener">Ementa no JupiterWeb</a></div>
    </article>`;
    if (rolar) caixa.scrollIntoView({ block: "nearest", behavior: calmo() ? "auto" : "smooth" });
  }

  const busca = ligarBusca($("#mdBusca"), nomesNoMapa, { aoEscolher: (c) => { if (c) escolher(c, true); } });
  alvo.addEventListener("click", (e) => {
    const m = e.target.closest("[data-medida]");
    if (m) { medida = m.dataset.medida; desenharFiltros(); desenharRanking(); desenharLegenda(); refazer(true); return; }
    const s = e.target.closest("[data-sigla]");
    if (s) { escolher(s.dataset.sigla, true); return; }
    const k = e.target.closest("[data-comentar]");
    if (k) form?.escolher(k.dataset.comentar);
  });
  $("#mdCurso").addEventListener("change", (e) => { curso = e.target.value; marcarCurso(); desenharLegenda(); desenhar(); });

  /* ---------- começo ---------- */
  desenharFiltros(); desenharRanking(); desenharLegenda();
  tela.setAttribute("aria-label", `Mapa com ${nos.length} disciplinas agrupadas pelo lugar onde são dadas: os prédios da Poli, o IME, a Física e outras unidades. ${rec.size ? `${rec.size} disciplinas têm reclamações; a lista "Disciplinas com mais registros" traz as principais.` : "Ainda não há reclamações registradas."} Use a busca acima do mapa para achar uma disciplina.`);
  await document.fonts?.ready;
  lim = limites(Math.max(0, ...nos.map((n) => conta(n.c))));
  medir(); dispor();
  for (const n of nos) { n.x = centro.x; n.y = centro.y; }
  desenhar();
  const visto = new IntersectionObserver((es) => { if (es.some((x) => x.isIntersecting)) { visto.disconnect(); animar(centro); } }, { threshold: 0.25 });
  visto.observe(tela);
  let largura = W;
  new ResizeObserver(() => { if (quadro.clientWidth !== largura) { largura = quadro.clientWidth; medir(); dispor(); for (const n of nos) { n.x = n.tx; n.y = n.ty; } desenhar(); } }).observe(quadro);

  const form = ligarFormulario(site, nomes);
}

/* ---------- formulário "Comente uma disciplina" (fora do componente, na seção #comentar da página) ---------- */
function ligarFormulario(site, nomes) {
  const f = document.getElementById("formReclamacao");
  if (!f) return null;
  const q = (s) => f.querySelector(s);
  const busca = ligarBusca(q("#recBusca"), nomes, { aoEscolher: () => { q("#recErro").hidden = true; } });
  q("#recNaturezas").innerHTML = Object.entries(NATUREZAS).map(([k, v]) => `<label><input type="checkbox" name="natureza" value="${k}"><span><b>${esc(v.rotulo)}</b><small>${esc(v.dica)}</small></span></label>`).join("");
  q("#recSemestre").innerHTML = `<option value="">Prefiro não dizer</option>${semestres().map((s, i) => `<option value="${s}">${s.replace(".", "º semestre de ").replace(/^(\d{4})º semestre de (\d)$/, "$2º semestre de $1")}${i === 0 ? " (agora)" : ""}</option>`).join("")}`;
  // no máximo três naturezas: as outras ficam travadas
  f.addEventListener("change", (e) => {
    if (e.target.name !== "natureza") return;
    const marcadas = f.querySelectorAll('[name="natureza"]:checked').length;
    f.querySelectorAll('[name="natureza"]').forEach((c) => { c.disabled = !c.checked && marcadas >= 3; });
  });
  const texto = q("#recTexto"), contador = q("#recConta");
  texto.addEventListener("input", () => { contador.textContent = `${texto.value.length} de 500`; });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const erro = q("#recErro"), ok = q("#recOk");
    const naturezas = [...f.querySelectorAll('[name="natureza"]:checked')].map((c) => c.value);
    const falta = !busca.sigla ? "Escolha a disciplina na lista (digite e toque numa das sugestões)." : !naturezas.length ? "Marque pelo menos uma natureza." : "";
    if (falta) { erro.textContent = falta; erro.hidden = false; return; }
    erro.hidden = true;
    const botao = q("button[type=submit]"); botao.disabled = true;
    const r = await enviarReclamacao(site, { sigla: busca.sigla, categorias: naturezas, semestre: q("#recSemestre").value, texto: texto.value });
    botao.disabled = false;
    if (r.erro) { erro.textContent = r.erro; erro.hidden = false; return; }
    f.reset(); busca.escolher(null); contador.textContent = "0 de 500";
    f.querySelectorAll('[name="natureza"]').forEach((c) => { c.disabled = false; });
    ok.hidden = false; setTimeout(() => { ok.hidden = true; }, 8000);
  });
  return { escolher: (c) => { busca.escolher(c); q("#recBusca").closest("form").scrollIntoView({ block: "start", behavior: calmo() ? "auto" : "smooth" }); } };
}
