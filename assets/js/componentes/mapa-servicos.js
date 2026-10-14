// Página Serviços: mapa do campus com zoom (arrastar, rodinha, pinça e botões) e os
// empreendimentos do Grêmio num só marcador com as logos (dados/servicos.js). Tocar numa
// logo leva ao cartão do serviço. Usa o mesmo mapa-base do guia dos bandejões.
// Uso: <div class="mapa-serv" id="mapaServ"></div>, cartões com data-servico, e
// <div data-componente="mapa-servicos"></div>.

import { L } from "../dados/mapa-campus.js?v=202610141956";
import { servicos, pontoNoMapa } from "../dados/servicos.js?v=202610141956";

const NS = "http://www.w3.org/2000/svg";
const el = (t, a = {}, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };

export default function mapaServicos(_alvo, { url }) {
  const caixa = document.getElementById("mapaServ");
  if (!caixa) return;
  caixa.innerHTML = `<svg class="mapa-serv__svg" role="img" aria-label="Mapa da Poli com os serviços do Grêmio"></svg>
    <div class="mapa-serv__zoom">
      <button type="button" data-z="in" aria-label="Aproximar">+</button>
      <button type="button" data-z="out" aria-label="Afastar">−</button>
      <button type="button" data-z="poli" class="txt" aria-label="Voltar para a Poli">POLI</button>
    </div>
    <p class="mapa-serv__dica">Arraste para mover · use + e − para o zoom</p>`;
  const svg = caixa.querySelector("svg");

  // camadas do mapa-base
  const base = el("g", {}, svg), marcas = el("g", {}, svg);
  el("rect", { x: -2000, y: -2000, width: 6000, height: 6000, class: "ms-chao" }, base);
  el("path", { d: L.river, class: "ms-agua" }, base);
  el("path", { d: L.outer + L.inner, class: "ms-campus" }, base);
  el("path", { d: L.brown, class: "ms-livre" }, base);
  el("path", { d: L.raia, class: "ms-raia" }, base);
  el("path", { d: L.poli, class: "ms-poli" }, base);
  el("path", { d: L.roads, class: "ms-rua" }, base);
  el("path", { d: L.bld, class: "ms-predio" }, base);
  el("path", { d: L.bldpoli, class: "ms-predio-poli" }, base);
  const rotulos = [["POLI", 870, 215, "ms-rot ms-rot--poli", 22], ["Raia Olímpica", 1180, 322, "ms-rot ms-rot--agua", 13]];

  // marcadores com a logo
  const fixos = [];
  const fixo = (g, x, y) => { g.dataset.x = x; g.dataset.y = y; fixos.push(g); return g; };
  rotulos.forEach(([t, x, y, c, fs]) => { const g = fixo(el("g", {}, marcas), x, y); const tx = el("text", { class: c, "font-size": fs, "text-anchor": "middle" }, g); tx.textContent = t; });
  // um só marcador para os serviços vizinhos: balão com as logos lado a lado, ponta no Triedro
  const juntos = servicos.filter((s) => s.noPonto);
  if (juntos.length) {
    const P = pontoNoMapa, n = juntos.length, lado = 44, folga = 7, T = -(14 + lado + 12), meio = (n * lado + (n + 1) * folga) / 2;
    const g = fixo(el("g", { class: "ms-grupo" }, marcas), P.x, P.y);
    el("path", { d: `M${-meio + 12} ${T} H${meio - 12} a12 12 0 0 1 12 12 V-26 a12 12 0 0 1 -12 12 H8 L0 0 L-8 -14 H${-meio + 12} a12 12 0 0 1 -12 -12 V${T + 12} a12 12 0 0 1 12 -12z`, class: "ms-pino" }, g);
    juntos.forEach((s, i) => {
      const x = -meio + folga + i * (lado + folga);
      const m = el("g", { class: "ms-marca", tabindex: "0", role: "button", "aria-label": `${s.nome}: ir para o cartão` }, g);
      el("rect", { x: x - 3, y: T + 2, width: lado + 6, height: lado + 8, rx: 8, class: "ms-alvo" }, m);
      el("image", { href: url(s.logo), x, y: T + 6, width: lado, height: lado }, m);
      const ir = () => document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      m.addEventListener("click", ir); m.addEventListener("keydown", (e) => { if (e.key === "Enter") ir(); });
    });
    const t = el("text", { class: "ms-nome", x: meio + 10, y: T + 26 }, g); t.textContent = P.nome;
    const t2 = el("text", { class: "ms-onde", x: meio + 10, y: T + 42 }, g); t2.textContent = P.onde;
  }

  // visão e zoom
  const V = { x: 0, y: 0, w: 520 };
  const vh = () => V.w * caixa.clientHeight / Math.max(1, caixa.clientWidth);
  const aplicar = () => {
    svg.setAttribute("viewBox", `${V.x} ${V.y} ${V.w} ${vh()}`);
    const k = V.w / Math.max(1, caixa.clientWidth);
    fixos.forEach((g) => g.setAttribute("transform", `translate(${g.dataset.x} ${g.dataset.y}) scale(${k})`));
  };
  const centrar = (cx, cy, w) => { V.w = Math.min(1900, Math.max(160, w)); V.x = cx - V.w / 2; V.y = cy - vh() / 2; aplicar(); };
  const poli = () => centrar(820, 420, 560);
  const zoom = (f, cx = V.x + V.w / 2, cy = V.y + vh() / 2) => {
    const px = (cx - V.x) / V.w, py = (cy - V.y) / vh();
    V.w = Math.min(1900, Math.max(160, V.w * f)); V.x = cx - px * V.w; V.y = cy - py * vh(); aplicar();
  };
  caixa.querySelector(".mapa-serv__zoom").addEventListener("click", (e) => {
    const b = e.target.closest("[data-z]"); if (!b) return;
    if (b.dataset.z === "in") zoom(0.7); else if (b.dataset.z === "out") zoom(1 / 0.7); else poli();
  });
  const noMapa = (ev) => { const r = caixa.getBoundingClientRect(); return [V.x + (ev.clientX - r.left) / r.width * V.w, V.y + (ev.clientY - r.top) / r.height * vh()]; };
  caixa.addEventListener("wheel", (e) => { if (!e.ctrlKey && !caixa.matches(":hover")) return; e.preventDefault(); const [x, y] = noMapa(e); zoom(Math.exp(e.deltaY * 0.0015), x, y); }, { passive: false });
  const dedos = new Map(); let arrasto = null, pinca = null;
  svg.addEventListener("pointerdown", (e) => {
    svg.setPointerCapture(e.pointerId); dedos.set(e.pointerId, [e.clientX, e.clientY]);
    if (dedos.size === 1) arrasto = { x: e.clientX, y: e.clientY, vx: V.x, vy: V.y };
    if (dedos.size === 2) { const [a, b] = [...dedos.values()]; pinca = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), w: V.w }; arrasto = null; }
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dedos.has(e.pointerId)) return; dedos.set(e.pointerId, [e.clientX, e.clientY]);
    if (pinca && dedos.size === 2) { const [a, b] = [...dedos.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); const [mx, my] = noMapa({ clientX: (a[0] + b[0]) / 2, clientY: (a[1] + b[1]) / 2 }); zoom((pinca.w * pinca.d / Math.max(d, 1)) / V.w, mx, my); return; }
    if (arrasto) { const s = V.w / caixa.clientWidth; V.x = arrasto.vx - (e.clientX - arrasto.x) * s; V.y = arrasto.vy - (e.clientY - arrasto.y) * s; aplicar(); caixa.classList.add("arrastando"); }
  });
  const soltar = (e) => { dedos.delete(e.pointerId); if (dedos.size < 2) pinca = null; if (!dedos.size) { arrasto = null; caixa.classList.remove("arrastando"); } };
  svg.addEventListener("pointerup", soltar); svg.addEventListener("pointercancel", soltar);
  new ResizeObserver(() => aplicar()).observe(caixa);

  poli();
}
