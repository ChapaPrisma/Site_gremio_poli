// Guia dos bandejões (aluno/bandejoes/): cardápio do dia, mapa do campus com o caminho a pé
// até cada bandejão, cartões com horários e passo a passo.
// Uso: a marcação fica em aluno/bandejoes/index.html e este componente dá vida a ela:
//   <div data-componente="guia-bandejoes"></div>
// Carregado sob demanda pelo site.js (o mapa pesa ~150 KB e só é usado aqui).
//
// Dados: bandejões e horários em dados/bandejoes.js; mapa em dados/mapa-campus.js;
// cardápio em assets/dados/cardapio.json, atualizado por ferramentas/cardapio.mjs.

import { L, ICONS, GRID_RLE } from "../dados/mapa-campus.js?v=202610141050";
import { bandejoes as B, hora as fmtH, agoraSP, hojeSP, situacao, temJantar, carregarCardapio } from "../dados/bandejoes.js?v=202610141050";

const NS = "http://www.w3.org/2000/svg", MPP = 2.143, CELL = 4, GW = 500, GH = 353, SPEED = 75;
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const el = (t, a = {}, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Pontos de partida na Poli (pixels do mapa).
const O = [
  { id: "bienio", de: "do Biênio", n: "Biênio", sub: "Prédio do Biênio, Cirquinho e prédios vizinhos.", x: 697, y: 480 },
  { id: "adm", de: "do prédio da Administração", n: "Administração", sub: "Prédio da Administração (Mário Covas Júnior) e arredores.", x: 826, y: 371 },
  { id: "raia", de: "do seu prédio no lado da Raia", n: "Lado da Raia", sub: "Mecânica, Naval, Minas e Metalurgia, na Av. Prof. Mello Moraes.", x: 905, y: 262 },
  { id: "eq", de: "da Engenharia Química", n: "Eng. Química", sub: "Engenharia Química, no Conjunto das Químicas.", x: 1003, y: 762 },
];
const MEALS = [["almoco", "Almoço"], ["jantar", "Jantar"]];
const iconeBandejao = (r) => `<svg width="${2 * r + 6}" height="${2 * r + 6}" viewBox="${-r - 3} ${-r - 3} ${2 * r + 6} ${2 * r + 6}" aria-hidden="true"><circle r="${r}" fill="var(--sol)" stroke="var(--tinta)" stroke-width="2.5"/><path d="M${-r * .53} ${r * .21}a${r * .53} ${r * .53} 0 0 1 ${r * 1.06} 0z" fill="var(--azul)"/><rect x="${-r * .58}" y="${r * .34}" width="${r * 1.16}" height="3" rx="1.5" fill="var(--tinta)"/></svg>`;

export default function guiaBandejoes(_alvo, { raiz }) {
  if (!$("#map")) return;

  /* ---------- grade de caminhada ---------- */
  const G = new Uint8Array(GW * GH);
  { let i = 0; const re = /([xay])(\d+)/g; let mt; while ((mt = re.exec(GRID_RLE))) { const v = mt[1] === "x" ? 0 : mt[1] === "a" ? 1 : 3; G.fill(v, i, i + +mt[2]); i += +mt[2]; } }
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], DL = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
  function snap(x, y) {
    const c0 = Math.round(x / CELL - .5), r0 = Math.round(y / CELL - .5);
    for (let rad = 0; rad <= 30; rad++) {
      let best = -1, bd = 1e9;
      for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        if (Math.max(Math.abs(dr), Math.abs(dc)) !== rad) continue;
        const r = r0 + dr, c = c0 + dc; if (r < 0 || c < 0 || r >= GH || c >= GW) continue;
        const i = r * GW + c; if (G[i] && dr * dr + dc * dc < bd) { bd = dr * dr + dc * dc; best = i; }
      }
      if (best >= 0) return best;
    }
    return -1;
  }
  function dijkstra(src) {
    const N = GW * GH, dist = new Float64Array(N).fill(Infinity), prev = new Int8Array(N).fill(-1);
    const hi = [], hd = [];
    const push = (i, d) => { hi.push(i); hd.push(d); let k = hi.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (hd[p] <= hd[k]) break; [hi[p], hi[k]] = [hi[k], hi[p]]; [hd[p], hd[k]] = [hd[k], hd[p]]; k = p; } };
    const pop = () => { const ti = hi[0], td = hd[0], li = hi.pop(), ld = hd.pop(); if (hi.length) { hi[0] = li; hd[0] = ld; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < hi.length && hd[a] < hd[m]) m = a; if (b < hi.length && hd[b] < hd[m]) m = b; if (m === k) break; [hi[m], hi[k]] = [hi[k], hi[m]]; [hd[m], hd[k]] = [hd[k], hd[m]]; k = m; } } return [ti, td]; };
    dist[src] = 0; push(src, 0);
    while (hi.length) {
      const [u, du] = pop(); if (du > dist[u]) continue;
      const r = (u / GW) | 0, c = u - r * GW;
      for (let k = 0; k < 8; k++) {
        const rr = r + DY[k], cc = c + DX[k]; if (rr < 0 || cc < 0 || rr >= GH || cc >= GW) continue;
        const v = rr * GW + cc, g = G[v]; if (!g) continue;
        if (k >= 4 && (!G[r * GW + cc] || !G[rr * GW + c])) continue;
        const nd = du + DL[k] * g; if (nd < dist[v]) { dist[v] = nd; prev[v] = k; push(v, nd); }
      }
    }
    return { dist, prev };
  }
  // prev guarda a direção usada para chegar; BACK dá a oposta
  const BACK = [1, 0, 3, 2, 7, 6, 5, 4];
  function trace(field, start) {
    if (start < 0 || !isFinite(field.dist[start])) return null;
    let i = start, len = 0; const pts = [];
    for (let guard = 0; guard < GW * GH; guard++) {
      const r = (i / GW) | 0, c = i - r * GW; pts.push([c * CELL + CELL / 2, r * CELL + CELL / 2]);
      const k = field.prev[i]; if (k < 0) break;
      const kk = BACK[k];
      i = (r + DY[kk]) * GW + (c + DX[kk]); len += DL[kk];
    }
    return { pts, m: len * CELL * MPP };
  }
  function rdp(p, eps) {
    if (p.length < 3) return p;
    let dmax = 0, idx = 0; const [x1, y1] = p[0], [x2, y2] = p[p.length - 1]; const dx = x2 - x1, dy = y2 - y1, Ln = Math.hypot(dx, dy) || 1;
    for (let i = 1; i < p.length - 1; i++) { const d = Math.abs(dy * p[i][0] - dx * p[i][1] + x2 * y1 - y2 * x1) / Ln; if (d > dmax) { dmax = d; idx = i; } }
    if (dmax > eps) { const a = rdp(p.slice(0, idx + 1), eps), b = rdp(p.slice(idx), eps); return a.slice(0, -1).concat(b); }
    return [p[0], p[p.length - 1]];
  }
  const FIELDS = B.map((b) => dijkstra(snap(b.x, b.y)));

  /* ---------- desenho do mapa ---------- */
  const svg = $("#map");
  const gBase = el("g", {}, svg), gPD = el("g", { visibility: "hidden" }, svg), gTop = el("g", {}, svg), gRoutes = el("g", {}, svg), gFood = el("g", { visibility: "hidden" }, svg), gLabels = el("g", {}, svg), gMarks = el("g", {}, svg);
  el("rect", { x: -2000, y: -2000, width: 6000, height: 6000, class: "m-ground" }, gBase);
  el("path", { d: L.river, class: "m-water" }, gBase);
  el("path", { d: L.outer + L.inner, class: "m-land" }, gBase);
  el("path", { d: L.brown, class: "m-free" }, gBase);
  el("path", { d: L.raia, class: "m-raia" }, gBase);
  el("path", { d: L.poli, class: "m-poli" }, gBase);
  el("path", { d: L.pinkz, class: "pd-bad" }, gPD);
  el("path", { d: L.greenz, class: "pd-good" }, gPD);
  el("path", { d: L.poli, class: "pd-bad" }, gPD);
  el("path", { d: L.roads, class: "m-road" }, gTop);
  el("path", { d: L.bld, class: "m-bld" }, gTop);
  el("path", { d: L.bldpoli, class: "m-pbld" }, gTop);

  const scaled = []; // elementos com tamanho fixo em tela
  const fixed = (g, x, y) => { g.dataset.x = x; g.dataset.y = y; scaled.push(g); return g; };
  [
    ["Rio Pinheiros", 1360, 232, 27, "water", 15], ["Raia Olímpica", 1180, 322, 27, "water", 13],
    ["Jaguaré", 480, 205, 0, "hood", 13], ["Alto de Pinheiros", 1420, 150, 0, "hood", 13], ["Butantã", 1420, 1040, 0, "hood", 13],
    ["Vila Indiana", 820, 1210, 0, "hood", 13], ["Rio Pequeno", 120, 1000, 0, "hood", 13], ["São Remo", 115, 760, 0, "hood", 13],
    ["CEPE", 1470, 775, 0, "", 12], ["POLI", 870, 215, 0, "poli", 19],
  ].forEach(([t, x, y, rot, cls, fs]) => { const g = fixed(el("g", {}, gLabels), x, y); g.dataset.rot = rot; const tx = el("text", { class: "lbl " + cls, "text-anchor": "middle", "font-size": fs }, g); tx.textContent = t; });
  [["P1", 1676, 902], ["P2", 703, 170], ["P3", 292, 1128]].forEach(([t, x, y]) => { const g = fixed(el("g", { class: "gate" }, gLabels), x, y); el("rect", { x: -13, y: -9, width: 26, height: 18, rx: 5 }, g); const tx = el("text", { y: 4 }, g); tx.textContent = t; });
  const FC = { restaurante: "f-rest", lanchonete: "f-lanch", rua: "f-rua", outros: "f-outros" };
  for (const k in FC) (ICONS[k] || []).forEach((p) => { const g = fixed(el("g", { class: "food" }, gFood), p[0], p[1]); el("circle", { r: 5.5, class: FC[k] }, g); });
  const OM = {};
  O.forEach((o) => { const g = fixed(el("g", { class: "omk", tabindex: "-1" }, gMarks), o.x, o.y); el("circle", { r: 6.5, class: "o" }, g); const t = el("text", { x: 10, y: 4 }, g); t.textContent = o.n; g.addEventListener("click", (e) => { e.stopPropagation(); setOrigin(o.id); }); OM[o.id] = g; });
  const you = fixed(el("g", { class: "you", visibility: "hidden" }, gMarks), 0, 0);
  el("path", { d: "M0 0C-4-8-11-12-11-20a11 11 0 0 1 22 0c0 8-7 12-11 20z", fill: "var(--azul)", stroke: "#fff", "stroke-width": 2.5 }, you);
  el("circle", { cy: -20, r: 4, fill: "#fff", stroke: "none" }, you);
  const BM = {};
  B.forEach((b) => {
    const g = fixed(el("g", { class: "bmk" }, gMarks), b.x, b.y);
    el("circle", { r: 15, class: "disc" }, g); el("path", { d: "M-8 3a8 8 0 0 1 16 0z", class: "band" }, g);
    el("rect", { x: -9, y: 5, width: 18, height: 2.6, rx: 1.3, fill: "var(--tinta)" }, g);
    const nm = el("text", { x: 20, y: 5, class: "name" }, g); nm.textContent = b.nome;
    g.addEventListener("click", (e) => { e.stopPropagation(); selectDest(b.id, true); }); BM[b.id] = g;
  });

  /* ---------- viewport (arrastar e aproximar) ---------- */
  const box = $("#mapbox"); const V = { x: 300, y: 150, w: 1050 };
  const vh = () => V.w * box.clientHeight / Math.max(1, box.clientWidth);
  function apply() {
    svg.setAttribute("viewBox", `${V.x} ${V.y} ${V.w} ${vh()}`);
    const k = V.w / Math.max(1, box.clientWidth);
    scaled.forEach((g) => { const r = g.dataset.rot ? ` rotate(${g.dataset.rot})` : ""; g.setAttribute("transform", `translate(${g.dataset.x} ${g.dataset.y}) scale(${k})${r}`); });
  }
  const clampV = () => { V.w = Math.min(1900, Math.max(140, V.w)); };
  function fit(x0, y0, x1, y1, pad = 60) {
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad; const ar = box.clientHeight / Math.max(1, box.clientWidth);
    let w = x1 - x0; if ((y1 - y0) > w * ar) w = (y1 - y0) / ar; V.w = w; clampV(); V.x = (x0 + x1) / 2 - V.w / 2; V.y = (y0 + y1) / 2 - vh() / 2; apply();
  }
  function zoomAt(f, cx, cy) { const h = vh(); const px = (cx - V.x) / V.w, py = (cy - V.y) / h; V.w *= f; clampV(); V.x = cx - px * V.w; V.y = cy - py * vh(); apply(); }
  function toMap(ev) { const r = box.getBoundingClientRect(); return [V.x + (ev.clientX - r.left) / r.width * V.w, V.y + (ev.clientY - r.top) / r.height * vh()]; }
  box.addEventListener("wheel", (e) => { e.preventDefault(); const [x, y] = toMap(e); zoomAt(Math.exp(e.deltaY * .0015), x, y); }, { passive: false });
  const ptrs = new Map(); let drag = null, moved = false, pinch = null;
  box.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".zoom")) return; box.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved = false;
    if (ptrs.size === 1) drag = { sx: e.clientX, sy: e.clientY, vx: V.x, vy: V.y };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: V.w }; drag = null; moved = true; }
  });
  box.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const [mx, my] = toMap({ clientX: (a[0] + b[0]) / 2, clientY: (a[1] + b[1]) / 2 }); zoomAt((pinch.w * pinch.d / Math.max(d, 1)) / V.w, mx, my); return; }
    if (drag) {
      const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.hypot(dx, dy) > 6) { moved = true; box.classList.add("drag"); }
      if (moved) { const s = V.w / box.clientWidth; V.x = drag.vx - dx * s; V.y = drag.vy - dy * s; apply(); }
    }
  });
  const up = (e) => {
    ptrs.delete(e.pointerId); box.classList.remove("drag"); if (ptrs.size < 2) pinch = null;
    if (ptrs.size === 0 && drag && !moved && e.type === "pointerup") {
      const t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && (t.closest(".bmk") || t.closest(".omk"))) t.closest("g").dispatchEvent(new MouseEvent("click", { bubbles: true }));
      else { const [x, y] = toMap(e); setCustom(x, y); }
    }
    if (ptrs.size === 0) drag = null;
  };
  box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
  $("#zin").onclick = () => zoomAt(.7, V.x + V.w / 2, V.y + vh() / 2);
  $("#zout").onclick = () => zoomAt(1 / .7, V.x + V.w / 2, V.y + vh() / 2);
  $("#zfit").onclick = () => fitRoute();
  $("#zall").onclick = () => fit(160, 90, 1700, 1200, 10);
  new ResizeObserver(() => apply()).observe(box);

  /* ---------- estado ---------- */
  let origin = null, routes = [], dest = null;
  let MENU = {}, ESTADO = "carregando"; // carregando | ok | falhou
  function toast(t) { const e = $("#toast"); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (e.hidden = true), 2600); }
  function computeFrom(x, y) {
    const s = snap(x, y); if (s < 0) return null;
    return B.map((b, i) => {
      const tr = trace(FIELDS[i], s); if (!tr) return null;
      const pts = rdp(tr.pts, 6); pts.unshift([x, y]); pts.push([b.x, b.y]);
      return { b, m: tr.m + Math.hypot(tr.pts[0][0] - x, tr.pts[0][1] - y) * MPP, pts };
    }).filter(Boolean).sort((a, c) => a.m - c.m);
  }
  const mins = (m) => Math.max(1, Math.round(m / SPEED));
  const metros = (m) => (m >= 1000 ? (m / 1000).toFixed(1).replace(".", ",") + " km" : Math.round(m / 10) * 10 + " m");
  function setOrigin(id) {
    const o = O.find((o) => o.id === id); const r = computeFrom(o.x, o.y); if (!r) return;
    origin = { ...o }; routes = r;
    $$("#origins .chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.id === id));
    $("#osub").textContent = o.sub; you.setAttribute("visibility", "hidden");
    Object.entries(OM).forEach(([k, g]) => g.classList.toggle("sel", k === id));
    dest = routes[0].b.id; render(); fitRoute();
  }
  function setCustom(x, y) {
    const r = computeFrom(x, y); if (!r || !r.length) { toast("Toque dentro do campus para calcular o caminho."); return; }
    origin = { id: "custom", de: "do ponto marcado", n: "Ponto marcado", x, y }; routes = r;
    $$("#origins .chip").forEach((c) => c.setAttribute("aria-pressed", c.dataset.id === "custom"));
    $("#osub").textContent = "Você marcou um ponto no mapa. Toque em outro lugar para mudar.";
    you.dataset.x = x; you.dataset.y = y; you.setAttribute("visibility", "visible");
    Object.values(OM).forEach((g) => g.classList.remove("sel"));
    dest = routes[0].b.id; render(); apply();
  }
  function selectDest(id, fromMap) { dest = id; render(); if (fromMap) fitRoute(); }
  function render() {
    gRoutes.replaceChildren();
    const d = (p) => "M" + p.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join("L");
    routes.forEach((r) => { if (r.b.id !== dest) el("path", { d: d(r.pts), class: "r-alt", "vector-effect": "non-scaling-stroke" }, gRoutes); });
    const s = routes.find((r) => r.b.id === dest);
    if (s) { el("path", { d: d(s.pts), class: "r-sel-case", "vector-effect": "non-scaling-stroke" }, gRoutes); el("path", { d: d(s.pts), class: "r-sel", "vector-effect": "non-scaling-stroke" }, gRoutes); }
    Object.entries(BM).forEach(([k, g]) => { g.classList.toggle("sel", k === dest); if (k === dest) gMarks.appendChild(g); });
    const ol = $("#res"); ol.replaceChildren();
    routes.forEach((r, i) => {
      const st = situacao(r.b); const li = document.createElement("li");
      li.innerHTML = `<button type="button" class="rc" aria-pressed="${r.b.id === dest}">
        <span class="num">${iconeBandejao(17)}</span>
        <span class="nm">${r.b.nome}${i === 0 ? '<span class="best">Mais perto</span>' : ""}</span>
        <span class="t tab">${mins(r.m)} min<small>${metros(r.m)}</small></span>
        <span class="st"><span class="pill ${st.aberto ? "on" : ""}">${st.texto}</span></span></button>`;
      li.firstElementChild.onclick = () => selectDest(r.b.id, true); ol.appendChild(li);
    });
    const sel = routes.find((r) => r.b.id === dest);
    const [olat, olon] = toLatLon(origin.x, origin.y);
    $("#gmaps").href = `https://www.google.com/maps/dir/?api=1&origin=${olat.toFixed(5)},${olon.toFixed(5)}&destination=${sel.b.lat},${sel.b.lon}&travelmode=walking`;
    $("#gmaps").textContent = `Abrir o caminho até a ${sel.b.nome} no Google Maps`;
    renderSteps(sel); renderMenuToday(sel.b);
  }
  // conversão aproximada pixel do mapa -> lat/lon (UTM 23S, SIRGAS 2000)
  function toLatLon(x, y) {
    const E = 324000 + (x - 1100) * MPP, N = 7392000 - (y - 1293) * MPP;
    const a = 6378137, f = 1 / 298.257222101, e2 = f * (2 - f), k0 = .9996, lon0 = -45 * Math.PI / 180;
    const x0 = E - 500000, yN = N - 10000000, ep2 = e2 / (1 - e2);
    const M = yN / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
    const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
    const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu);
    const C1 = ep2 * Math.cos(p1) ** 2, T1 = Math.tan(p1) ** 2, N1 = a / Math.sqrt(1 - e2 * Math.sin(p1) ** 2), R1 = a * (1 - e2) / (1 - e2 * Math.sin(p1) ** 2) ** 1.5, D = x0 / (N1 * k0);
    const lat = p1 - (N1 * Math.tan(p1) / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24);
    const lon = lon0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6) / Math.cos(p1);
    return [lat * 180 / Math.PI, lon * 180 / Math.PI];
  }
  function fitRoute() {
    const s = routes.find((r) => r.b.id === dest); if (!s) return;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; s.pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    fit(x0, y0, x1, y1, 130);
  }

  /* ---------- painel de origem e cartões ---------- */
  $("#origins").innerHTML = O.map((o) => `<button type="button" class="chip" data-id="${o.id}" aria-pressed="false">${o.n}</button>`).join("") + `<button type="button" class="chip custom" data-id="custom" aria-pressed="false">Ponto no mapa</button>`;
  $$("#origins .chip").forEach((c) => (c.onclick = () => {
    if (c.dataset.id === "custom") { toast("Toque no mapa onde você está."); box.scrollIntoView({ block: "nearest" }); return; }
    setOrigin(c.dataset.id);
  }));

  let BIEN = null; const bien = () => BIEN || (BIEN = computeFrom(O[0].x, O[0].y) || []);
  const hrsRow = (label, list, name) => { const it = list.find((l) => l[0] === name); return `<tr><th>${label}</th><td class="${it ? "" : "no"} tab">${it ? fmtH(it[1]) + " às " + fmtH(it[2]) : "Não serve"}</td></tr>`; };
  function cards() {
    $("#bgrid").innerHTML = B.map((b) => {
      const st = situacao(b); const rb = bien().find((r) => r.b.id === b.id);
      return `<article class="bc" id="b-${b.id}">
        <header>${iconeBandejao(19)}<div><small>${rb ? mins(rb.m) + " min a pé do Biênio" : ""}</small><h3>${b.completo}</h3></div></header>
        <p>${b.onde}</p>
        <table class="hrs"><caption class="sr">Horários do ${b.completo}</caption>
          ${hrsRow("Café", b.semana, "Café da manhã")}${hrsRow("Almoço", b.semana, "Almoço")}${hrsRow("Jantar", b.semana, "Jantar")}
          <tr><th>Sábado</th><td class="tab ${b.sabado.length ? "" : "no"}">${b.sabado.length ? b.sabado.map((s) => s[0].replace(" da manhã", "") + " " + fmtH(s[1]) + "–" + fmtH(s[2])).join(" · ") : "Fechado"}</td></tr>
        </table>
        <div class="tagline">${b.destaque}</div>
        ${menuHTML(b, "Cardápio de hoje")}
        <div class="linha-acoes"><span class="pill ${st.aberto ? "on" : ""}">${st.texto}</span><a class="botao botao--linha botao--pequeno" href="#mapa" data-go="${b.id}">Ver caminho</a></div>
      </article>`;
    }).join("");
    $$("[data-go]").forEach((a) => (a.onclick = () => { selectDest(a.dataset.go, false); setTimeout(fitRoute, 350); }));
    if (bien()[0]) $("#factMin").textContent = mins(bien()[0].m) + " min";
  }

  /* ---------- passo a passo ---------- */
  const RUMO = ["ao norte", "ao nordeste", "ao leste", "ao sudeste", "ao sul", "ao sudoeste", "ao oeste", "ao noroeste"];
  const rumo = (b) => RUMO[Math.round(b / 45) % 8];
  const angd = (a, b) => ((b - a + 540) % 360) - 180;
  function legsOf(pts) {
    const P = rdp(pts, 10), Ls = [];
    for (let i = 1; i < P.length; i++) { const dx = P[i][0] - P[i - 1][0], dy = P[i][1] - P[i - 1][1], len = Math.hypot(dx, dy) * MPP; if (len < 1) continue; Ls.push({ dx, dy, len }); }
    const brg = (l) => (Math.atan2(l.dx, -l.dy) * 180 / Math.PI + 360) % 360;
    const merge = (arr) => { const out = []; arr.forEach((l) => { const p = out[out.length - 1]; if (p && Math.abs(angd(brg(p), brg(l))) < 28) { p.dx += l.dx; p.dy += l.dy; p.len += l.len; } else out.push({ ...l }); }); return out; };
    let M = merge(Ls);
    for (let pass = 0; pass < 2; pass++) { const out = []; M.forEach((l) => { if (l.len < 30 && out.length) { const p = out[out.length - 1]; p.dx += l.dx; p.dy += l.dy; p.len += l.len; } else out.push({ ...l }); }); M = merge(out); }
    return M.map((l) => ({ b: brg(l), len: l.len }));
  }
  const dist10 = (m) => (m < 1000 ? Math.max(10, Math.round(m / 10) * 10) + " m" : (m / 1000).toFixed(1).replace(".", ",") + " km");
  function renderSteps(r) {
    const Ls = legsOf(r.pts), ol = $("#steps"); ol.replaceChildren();
    $("#howTitle").textContent = `Como chegar a pé até a ${r.b.nome} · ${mins(r.m)} min`;
    Ls.forEach((l, i) => {
      const li = document.createElement("li"); let txt;
      if (i === 0) txt = `Saia ${origin.de} em direção ${rumo(l.b)} e siga <b>${dist10(l.len)}</b>.`;
      else {
        const d = angd(Ls[i - 1].b, l.b), lado = d > 0 ? "à direita" : "à esquerda", ad = Math.abs(d);
        const v = ad > 140 ? "Faça o retorno" : ad < 50 ? "Siga levemente " + lado : "Vire " + lado;
        txt = `${v} e continue <b>${dist10(l.len)}</b> ${rumo(l.b)}.`;
      }
      li.innerHTML = `<span>${txt}</span>`; ol.appendChild(li);
    });
    const end = document.createElement("li"); end.className = "end"; end.innerHTML = `<span>Chegada: <b>${esc(r.b.completo)}</b>. ${situacao(r.b).texto}.</span>`; ol.appendChild(end);
  }

  /* ---------- cardápio ---------- */
  const menuOf = (ru, date) => MENU[ru]?.dias?.[date] || null;
  const atualizado = (ru) => {
    const up = MENU[ru]?.atualizadoEm ? new Date(MENU[ru].atualizadoEm) : null;
    return up && !isNaN(up) ? `atualizado ${up.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })}` : "";
  };
  const semCardapio = (ru, meal) => {
    const { dia } = agoraSP(), b = B.find((x) => x.id === ru);
    if (dia === 0) return "Domingo não tem bandejão.";
    if (meal === "jantar" && !temJantar(b)) return "Este bandejão não serve jantar.";
    return "O cardápio de hoje ainda não chegou do Cardápio+. Confira no app.";
  };
  function menuHTML(b, title) {
    const day = menuOf(b.id, hojeSP());
    let body;
    if (ESTADO === "carregando") body = `<p class="empty-note">Carregando o cardápio…</p>`;
    else if (ESTADO === "falhou") body = `<p class="empty-note">Não deu para carregar o cardápio agora. Confira no app Cardápio+.</p>`;
    else if (!day || (!(day.almoco || []).length && !(day.jantar || []).length)) body = `<p class="empty-note">${semCardapio(b.id, "almoco")}</p>`;
    else body = MEALS.filter(([k]) => (day[k] || []).length).map(([k, lab]) => `<div class="meal"><b>${lab}</b><ul>${day[k].map((it) => `<li>${esc(it)}</li>`).join("")}</ul></div>`).join("");
    return `<div class="menu-box"><h3>${title}<small>${atualizado(b.id)}</small></h3>${body}</div>`;
  }
  function renderMenuToday(b) { $("#menuToday").outerHTML = menuHTML(b, `Hoje na ${b.nome}`).replace('class="menu-box"', 'class="menu-box" id="menuToday"'); }

  /* ---------- o que tem hoje ---------- */
  const HJ = { ru: null, meal: null };
  function initHoje() { HJ.ru = bien()[0]?.b.id || B[0].id; HJ.meal = agoraSP().minuto < 16 * 60 ? "almoco" : "jantar"; if (!temJantar(B.find((b) => b.id === HJ.ru))) HJ.meal = "almoco"; renderHoje(); }
  function renderHoje() {
    if (!HJ.ru) return;
    const b = B.find((x) => x.id === HJ.ru);
    $("#hojeRu").innerHTML = bien().map((r) => r.b).map((x) => `<button type="button" data-ru="${x.id}" aria-pressed="${x.id === HJ.ru}">${x.nome}</button>`).join("");
    $("#hojeMeal").innerHTML = MEALS.map(([k, lab]) => { const ok = k === "almoco" || temJantar(b); return `<button type="button" data-meal="${k}" aria-pressed="${k === HJ.meal}" ${ok ? "" : "disabled"}>${lab}</button>`; }).join("");
    const items = menuOf(HJ.ru, hojeSP())?.[HJ.meal] || [], st = situacao(b);
    let body;
    if (ESTADO === "carregando") body = `<p class="empty-note">Carregando o cardápio…</p>`;
    else if (ESTADO === "falhou") body = `<p class="empty-note">Não deu para carregar o cardápio agora. Confira no app Cardápio+.</p>`;
    else if (!items.length) body = `<p class="empty-note">${semCardapio(HJ.ru, HJ.meal)}</p>`;
    else body = items.map((it) => `<span class="it">${esc(it)}</span>`).join("");
    $("#hojeBody").innerHTML = body + `<span class="pill ${st.aberto ? "on" : ""}" style="margin-left:auto">${st.texto}</span>`;
    const up = atualizado(HJ.ru);
    $("#hojeSrc").textContent = "Cardápio do app Cardápio+ da USP" + (up ? " · " + up : "");
  }
  $("#hojeRu").addEventListener("click", (e) => { const x = e.target.closest("[data-ru]"); if (!x) return; HJ.ru = x.dataset.ru; if (!temJantar(B.find((b) => b.id === HJ.ru))) HJ.meal = "almoco"; renderHoje(); });
  $("#hojeMeal").addEventListener("click", (e) => { const x = e.target.closest("[data-meal]"); if (!x || x.disabled) return; HJ.meal = x.dataset.meal; renderHoje(); });

  /* ---------- camadas ---------- */
  const tog = (btn, g, leg) => { btn.onclick = () => { const on = btn.getAttribute("aria-pressed") !== "true"; btn.setAttribute("aria-pressed", on); g.setAttribute("visibility", on ? "visible" : "hidden"); $(leg).hidden = !on; }; };
  tog($("#tFood"), gFood, "#legFood"); tog($("#tPD"), gPD, "#legPD");

  const redesenhar = () => { render(); cards(); renderHoje(); };
  apply(); setOrigin("bienio"); cards(); initHoje();
  setInterval(redesenhar, 60_000);

  carregarCardapio(raiz).then((dados) => {
    if (dados?.restaurantes) { MENU = dados.restaurantes; ESTADO = "ok"; } else ESTADO = "falhou";
    redesenhar();
  });
}
