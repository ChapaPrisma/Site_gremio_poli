// "Onde fica cada engenharia" (Guia dos cursos): a Poli desenhada em escala a partir do Biênio, com zoom,
// e um botão que redesenha o campus em minutos a pé.
// Uso: <div data-componente="poli-do-bienio"></div>
//
// Tempo a pé: cada ponto do desenho continua na mesma direção a partir do Biênio, mas vai para a distância
// que se andaria no plano no tempo que se leva até ele (pelas calçadas e caminhos do OpenStreetMap, contando
// subidas e descidas pelo relevo do SRTM). O que é fácil de alcançar fica onde está; o que obriga a dar a
// volta ou a subir se afasta. As linhas de 5, 10 e 15 minutos, tortas no mapa, viram círculos. O "campo de
// caminhada" vem pronto de ferramentas/campus_poli.py.
//
// Coordenadas: metros com o Biênio na origem (x para leste, y para norte). O desenho fica num <g> com a
// transformação da câmera (zoom e arrasto mexem só nela); os rótulos são desenhados por cima, em pixels de
// tela, e se reorganizam a cada mudança para não se encostarem.
//
// Dados: dados/predios-poli.js (nomes, endereços) e assets/dados/campus-poli.json (OpenStreetMap).

import { predios, bienio } from "../dados/predios-poli.js?v=202610190742";
import { centros } from "../dados/cursos.js?v=202610190742";

const NS = "http://www.w3.org/2000/svg";
const GRAU = Math.PI / 180;
const M_POR_MIN = 80;                 // 4,8 km/h
const ISOCRONAS = [5, 10, 15];        // minutos
const NOMES_DIRECAO = { N: "norte", NE: "nordeste", L: "leste", SE: "sudeste", S: "sul", SO: "sudoeste", O: "oeste", NO: "noroeste" };
const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const metros = (lat, lon) => [(lon - bienio.lon) * 111320 * Math.cos(bienio.lat * GRAU), (lat - bienio.lat) * 110540];
const distancia = (m) => (m >= 995 ? `${(m / 1000).toFixed(1).replace(".0", "").replace(".", ",")} km` : `${Math.round(m / 10) * 10} m`);
const direcao = (x, y) => ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round((((Math.atan2(x, y) / GRAU) + 360) % 360) / 45) % 8];
const minutos = (m) => `${Math.max(1, Math.round(m / M_POR_MIN))} min a pé`;

// centro de área do maior anel (o "meio" do prédio, de onde sai a linha do rótulo)
function centroide(aneis) {
  let A = 0, X = 0, Y = 0;
  for (const anel of aneis) for (let i = 0; i < anel.length; i++) {
    const [x1, y1] = anel[i], [x2, y2] = anel[(i + 1) % anel.length], c = x1 * y2 - x2 * y1;
    A += c; X += (x1 + x2) * c; Y += (y1 + y2) * c;
  }
  return Math.abs(A) < 1e-6 ? aneis[0][0] : [X / (3 * A), Y / (3 * A)];
}

export default async function poliDoBienio(alvo, { url }) {
  let dados;
  try { dados = await (await fetch(url("assets/dados/campus-poli.json"))).json(); }
  catch { alvo.innerHTML = `<p class="nota">Não deu para carregar o desenho dos prédios agora.</p>`; return; }

  const RAIO = dados.raio, campo = dados.caminhada;
  // altitude (m) em qualquer ponto, pela grade do relevo; serve para dizer quanto se sobe até cada prédio
  const rel = dados.relevo;
  const altitude = rel ? ([x, y]) => {
    const fx = Math.min(Math.max((x + rel.lado) / rel.passo, 0), rel.n - 1.001), fy = Math.min(Math.max((y + rel.lado) / rel.passo, 0), rel.n - 1.001);
    const j = Math.floor(fx), i = Math.floor(fy), ax = fx - j, ay = fy - i, m = rel.m;
    return lerp(lerp(m[i][j], m[i][j + 1], ax), lerp(m[i + 1][j], m[i + 1][j + 1], ax), ay);
  } : null;
  const altBienio = altitude ? altitude([0, 0]) : 0;
  const subida = (l) => (Math.abs(l.sobe) >= 8 ? `, ${l.sobe > 0 ? "sobe" : "desce"} ${Math.abs(l.sobe)} m` : "");
  const casPorId = Object.fromEntries(centros.map((c) => [c.id, c]));

  /* ---------- campo de caminhada: metros andados até (r, θ) ---------- */
  const nR = campo.metros[0].length;
  function andado(r, th) {
    const ft = ((((th / (2 * Math.PI)) % 1) + 1) % 1) * campo.angulos, k0 = Math.floor(ft) % campo.angulos, k1 = (k0 + 1) % campo.angulos, ak = ft - Math.floor(ft);
    const fr = Math.min(r / campo.passo, nR - 1), j0 = Math.floor(fr), j1 = Math.min(j0 + 1, nR - 1), aj = fr - j0;
    const v = (k, j) => campo.metros[k][j];
    const base = lerp(lerp(v(k0, j0), v(k0, j1), aj), lerp(v(k1, j0), v(k1, j1), aj), ak);
    const andadoNoCampo = r > (nR - 1) * campo.passo ? base + (r - (nR - 1) * campo.passo) : base;
    // perto do Biênio (dentro dele e na saída) conta a linha reta, passando aos poucos para o campo
    return r <= 80 ? r : r < 170 ? lerp(r, andadoNoCampo, (r - 80) / 90) : andadoNoCampo;
  }
  // um ponto em metros, pronto para os dois desenhos: [direção, r em linha reta, r andado]
  const preparar = ([x, y]) => { const r = Math.hypot(x, y), th = Math.atan2(x, y); return [th, r, r ? andado(r, th) : 0]; };
  // segmentos curtos: reta no mapa vira curva no desenho em tempo a pé
  function amostrar(linha, fechada) {
    const out = [];
    const n = fechada ? linha.length : linha.length - 1;
    for (let i = 0; i < n; i++) {
      const a = linha[i], b = linha[(i + 1) % linha.length], passos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
      for (let k = 0; k < passos; k++) out.push(preparar([lerp(a[0], b[0], k / passos), lerp(a[1], b[1], k / passos)]));
    }
    if (!fechada) out.push(preparar(linha.at(-1)));
    return out;
  }
  const formas = {
    grade: [], caminhos: dados.caminhos.map((l) => amostrar(l, false)), outros: [], poli: {},
    borda: [amostrar(Array.from({ length: 180 }, (_, k) => [RAIO * Math.sin((k * 2 * Math.PI) / 180), RAIO * Math.cos((k * 2 * Math.PI) / 180)]), true)],
    isocronas: [],
  };
  for (let g = -RAIO + 50; g < RAIO; g += 100) {
    const h = Math.sqrt(RAIO * RAIO - g * g);
    formas.grade.push(amostrar([[g, -h], [g, h]], false), amostrar([[-h, g], [h, g]], false));
  }
  for (const grupo of dados.predios.outros) formas.outros.push(...grupo.map((a) => amostrar(a, true)));
  for (const [id, grupos] of Object.entries(dados.predios)) if (id !== "outros") formas.poli[id] = grupos.flatMap((g) => g.map((a) => amostrar(a, true)));
  // linhas de mesmo tempo a pé: em cada direção, onde o campo passa de 5, 10 e 15 minutos
  for (const min of ISOCRONAS) {
    const alvoM = min * M_POR_MIN, pts = [];
    for (let k = 0; k <= 360; k++) {
      const th = (k * 2 * Math.PI) / 360;
      if (andado(RAIO, th) < alvoM) { pts.push(null); continue; }
      let lo = 0, hi = RAIO;
      for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; if (andado(m, th) < alvoM) lo = m; else hi = m; }
      pts.push([th, hi, alvoM]);
    }
    const pedacos = [[]];
    for (const p of pts) { if (p) pedacos.at(-1).push(p); else if (pedacos.at(-1).length) pedacos.push([]); }
    formas.isocronas.push({ min, pedacos: pedacos.filter((p) => p.length > 1) });
  }

  const lugares = predios.map((p, i) => {
    const [x, y] = metros(p.lat, p.lon);
    const aneis = (dados.predios[p.id] || []).flat();
    const meio = aneis.length ? centroide([aneis.reduce((a, b) => (b.length > a.length ? b : a))]) : [x, y];
    return { ...p, n: i + 1, r: Math.hypot(x, y), dir: direcao(x, y), meio: preparar(meio), andar: andado(Math.hypot(x, y), Math.atan2(x, y)),
      sobe: altitude ? Math.round((altitude([x, y]) - altBienio) / 5) * 5 : 0 };
  });

  alvo.innerHTML = `
    <figure class="pb">
      <div class="pb__quadro">
        <svg class="pb__svg" role="img" aria-labelledby="pbTitulo pbDesc">
          <title id="pbTitulo">Onde fica cada engenharia da Poli, a partir do Biênio</title>
          <desc id="pbDesc">Desenho dos prédios da Cidade Universitária num raio de ${distancia(RAIO)} do Biênio, com os prédios da Poli destacados. A lista abaixo traz os mesmos prédios, com distância, tempo a pé e endereço.</desc>
          <rect class="pb-fundo" width="100%" height="100%"/>
          <g class="pb-mundo"></g>
          <g class="pb-tela"></g>
        </svg>
        <div class="pb__zoom" role="group" aria-label="Zoom do desenho">
          <button type="button" data-zoom="1" aria-label="Aproximar">+</button>
          <button type="button" data-zoom="-1" aria-label="Afastar">−</button>
          <button type="button" data-zoom="0" class="pb__zoom-tudo">Ver tudo</button>
        </div>
        <p class="pb__dica" aria-hidden="true"></p>
      </div>
      <div class="pb__controle">
        <button type="button" class="botao botao--linha botao--pequeno pb__botao" aria-pressed="false">Ver em minutos a pé</button>
        <p class="pb__legenda" aria-live="polite"></p>
      </div>
      <details class="pb__lista-caixa">
        <summary>Endereço e departamentos de cada prédio</summary>
        <ol class="pb__lista">${lugares.map((l) => `<li>
          <span class="pb__n" aria-hidden="true">${l.n}</span>
          <div><b>${esc(l.nome)}</b> <span class="pb__dist">${l.id === "bie" ? "o ponto de partida" : `${distancia(l.r)} a ${NOMES_DIRECAO[l.dir]} do Biênio, uns ${minutos(l.andar)}${subida(l)}`}</span>
            <p>${esc(l.endereco)}. ${esc(l.deptos.length ? l.deptos.join("; ") : l.cursos)}.</p>
            ${l.cas.length ? `<p class="pb__cas">${l.cas.map((id) => `<a href="#${id}"><img src="${url(casPorId[id].logo)}" alt="" width="22" height="22" loading="lazy">${esc(casPorId[id].sigla)}</a>`).join("")}</p>` : ""}</div></li>`).join("")}</ol>
      </details>
    </figure>`;

  const figura = alvo.querySelector(".pb"), quadro = alvo.querySelector(".pb__quadro"), svg = alvo.querySelector("svg");
  const mundo = svg.querySelector(".pb-mundo"), tela = svg.querySelector(".pb-tela");
  const botao = alvo.querySelector(".pb__botao"), legenda = alvo.querySelector(".pb__legenda"), dica = alvo.querySelector(".pb__dica");
  const caixaLista = alvo.querySelector(".pb__lista-caixa");
  const toque = matchMedia("(pointer: coarse)").matches;
  dica.textContent = toque ? "Use dois dedos para mover e dar zoom." : "Arraste para mover. Para dar zoom, use os botões ou segure Ctrl e role.";
  const LEGENDAS = [
    "Em escala, com o norte para cima. As linhas tracejadas marcam até onde se chega a pé em 5, 10 e 15 minutos saindo do Biênio, contando as subidas.",
    `Cada ponto ficou na mesma direção, mas tão longe quanto o tempo que se leva para chegar nele a pé, pelas calçadas e caminhos do campus e contando as subidas: no plano, ${String(M_POR_MIN * 60 / 1000).replace(".", ",")} km/h; subindo, mais devagar; numa descida suave, um pouco mais rápido. O que exige dar a volta ou subir se afastou, e as linhas de 5, 10 e 15 minutos viraram círculos.`,
  ];

  const el = (tag, attrs = {}, pai) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (pai) pai.appendChild(e); return e; };
  const P = {
    grade: el("path", { class: "pb-grade" }, mundo), caminhos: el("path", { class: "pb-caminho" }, mundo),
    outros: el("path", { class: "pb-predio", "fill-rule": "evenodd" }, mundo),
    poli: Object.fromEntries(Object.keys(formas.poli).map((id) => [id, el("path", { class: `pb-poli pb-poli--${id.startsWith("bie") ? "bienio" : "eng"}`, "fill-rule": "evenodd", "data-id": id.replace("-anexo", "") }, mundo)])),
    isocronas: formas.isocronas.map(() => el("path", { class: "pb-iso" }, mundo)),
    borda: el("path", { class: "pb-borda" }, mundo),
  };

  /* ---------- estado: transformação (t) e câmera ---------- */
  let t = 0, alvoT = 0, anim = 0, W = 0, H = 0, compacto = false;
  const cam = { x: 0, y: 0, z: 1 };
  let zMin = 0.1, zMax = 5;
  const posMundo = ([th, r, ra], tt = suave(t)) => { const rr = lerp(r, ra, tt); return [rr * Math.sin(th), rr * Math.cos(th)]; };
  const paraTela = ([x, y]) => [W / 2 + (x - cam.x) * cam.z, H / 2 - (y - cam.y) * cam.z];

  function desenharFormas() {
    const te = suave(t);
    const d = (linhas, fechado) => linhas.map((l) => "M" + l.map((p) => posMundo(p, te).map((v) => v.toFixed(1)).join(" ")).join("L") + (fechado ? "Z" : "")).join("");
    P.grade.setAttribute("d", d(formas.grade));
    P.caminhos.setAttribute("d", d(formas.caminhos));
    P.outros.setAttribute("d", d(formas.outros, true));
    for (const id in P.poli) P.poli[id].setAttribute("d", d(formas.poli[id], true));
    formas.isocronas.forEach((iso, i) => P.isocronas[i].setAttribute("d", d(iso.pedacos)));
    P.borda.setAttribute("d", d(formas.borda, true));
  }

  /* ---------- rótulos, em pixels de tela ---------- */
  let R = [];
  function montarRotulos() {
    tela.replaceChildren();
    R = lugares.map((l) => {
      const g = el("g", { class: "pb-rotulo", "data-id": l.id }, tela);
      const linha = el("polyline", { class: "pb-guia" }, g);
      el("circle", { class: "pb-ponto", r: 3 }, g);
      const corpo = el("g", {}, g);
      const r = { l, g, linha, corpo, logos: [] };
      if (compacto) {
        el("circle", { r: 10, class: "pb-num" }, corpo);
        const n = el("text", { class: "pb-num__t", "text-anchor": "middle", y: 4 }, corpo); n.textContent = l.n;
        r.larg = 20; r.alt = 20;
      } else {
        r.tx = el("text", { class: "pb-nome" }, corpo); r.tx.textContent = l.nome;
        r.sub = el("text", { class: "pb-sub" }, corpo);
        r.logos = l.cas.map((id) => {
          const a = el("a", { href: `#${id}`, "aria-label": `Ir até o ${casPorId[id].sigla}` }, corpo);
          el("image", { href: url(casPorId[id].logo), width: 22, height: 22 }, a);
          el("rect", { width: 22, height: 22, rx: 4, class: "pb-logo__aro" }, a);
          return a;
        });
        r.larg = Math.max(r.tx.getComputedTextLength(), 110, r.logos.length * 26);
        r.alt = 30 + (r.logos.length ? 26 : 0);
      }
      const acende = (on) => svg.querySelectorAll(`.pb-poli[data-id="${l.id}"]`).forEach((p) => p.classList.toggle("is-ativo", on));
      g.addEventListener("pointerenter", () => acende(true)); g.addEventListener("pointerleave", () => acende(false));
      return r;
    });
    // setas para os prédios fora da vista (ex.: a Química, quase 1 km longe)
    R.forEach((r) => {
      r.fora = el("g", { class: "pb-fora", tabindex: 0, role: "button", "aria-label": `Ir até ${r.l.nome}` }, tela);
      r.foraFundo = el("rect", { rx: 12, height: 24 }, r.fora);
      r.foraTx = el("text", { y: 16, x: 10 }, r.fora);
      const ir = () => voar(posMundo(r.l.meio));
      r.fora.addEventListener("click", ir);
      r.fora.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ir(); } });
    });
    // muitos prédios fora da vista: uma etiqueta só, que enquadra todos
    G.todos = el("g", { class: "pb-fora", tabindex: 0, role: "button" }, tela);
    G.todosFundo = el("rect", { rx: 12, height: 24 }, G.todos);
    G.todosTx = el("text", { y: 16, x: 10 }, G.todos);
    const verTodos = () => { const e2 = enquadrar(); voar([e2.x, e2.y], e2.z); };
    G.todos.addEventListener("click", verTodos);
    G.todos.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); verTodos(); } });
    G.marcas = formas.isocronas.map((iso) => { const e = el("text", { class: "pb-iso__t" }, tela); e.textContent = `${iso.min} min`; return e; });
    G.norte = el("g", { class: "pb-norte" }, tela);
    el("path", { d: "M0 -14 L6 4 L0 0 L-6 4 Z" }, G.norte);
    el("text", { y: 18, "text-anchor": "middle" }, G.norte).textContent = "N";
    G.escala = el("g", { class: "pb-escala" }, tela);
    G.escalaLinha = el("path", {}, G.escala);
    G.escalaTx = el("text", { y: -6 }, G.escala);
  }
  const G = {};

  function posicionarRotulos() {
    const te = suave(t);
    const B = paraTela(posMundo(lugares[0].meio));
    const margem = 14;
    const vis = [];
    for (const r of R) {
      const A = paraTela(posMundo(r.l.meio));
      const dentro = A[0] > margem && A[0] < W - margem && A[1] > margem && A[1] < H - margem;
      r.A = A; r.dentro = dentro;
      r.g.style.display = dentro ? "" : "none";
      if (!dentro) continue;
      if (!compacto) r.sub.textContent = r.l.id === "bie" ? (te < 0.5 ? "o ponto de partida" : "0 min") : (te < 0.5 ? `${distancia(r.l.r)} a ${r.l.dir}` : minutos(r.l.andar) + subida(r.l));
      // direção da linha: para fora, a partir do Biênio (o próprio Biênio aponta para baixo e para a esquerda)
      let ux = A[0] - B[0], uy = A[1] - B[1], n = Math.hypot(ux, uy);
      if (n < 12) { ux = -0.75; uy = 0.66; n = 1; }
      ux /= n; uy /= n;
      const L = compacto ? 26 : 38;
      r.lado = Math.abs(ux) < 0.25 ? (A[0] < W / 2 ? -1 : 1) : Math.sign(ux);
      r.P = [A[0] + ux * L, A[1] + uy * L];
      vis.push(r);
    }
    // cada lado (esquerda e direita) em coluna: de cima para baixo, sem um rótulo encostar no outro
    for (const lado of [-1, 1]) {
      const col = vis.filter((r) => r.lado === lado).sort((a, b) => a.P[1] - b.P[1]);
      for (let i = 1; i < col.length; i++) {
        const ant = col[i - 1], min = ant.P[1] + (ant.alt + col[i].alt) / 2 + 6;
        const perto = Math.abs(col[i].P[0] - ant.P[0]) < (ant.larg + col[i].larg) / 2 + 30;
        if (perto && col[i].P[1] < min) col[i].P[1] = min;
      }
      // o que passou da borda de baixo volta para cima, empurrando os de cima; depois o mesmo com a de cima
      for (let i = col.length - 1; i >= 0; i--) {
        const lim = i === col.length - 1 ? H - 8 - col[i].alt / 2 : col[i + 1].P[1] - (col[i + 1].alt + col[i].alt) / 2 - 6;
        if (col[i].P[1] > lim) col[i].P[1] = lim;
      }
      for (let i = 0; i < col.length; i++) {
        const lim = i === 0 ? 8 + col[i].alt / 2 : col[i - 1].P[1] + (col[i - 1].alt + col[i].alt) / 2 + 6;
        if (col[i].P[1] < lim) col[i].P[1] = lim;
      }
    }
    for (const r of vis) {
      const [ax, ay] = r.A, [px, py] = r.P, cauda = compacto ? 8 : 12;
      const qx = px + r.lado * cauda;
      r.linha.setAttribute("points", `${ax.toFixed(1)},${ay.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)} ${qx.toFixed(1)},${py.toFixed(1)}`);
      r.g.querySelector(".pb-ponto").setAttribute("cx", ax.toFixed(1)); r.g.querySelector(".pb-ponto").setAttribute("cy", ay.toFixed(1));
      if (compacto) { r.corpo.setAttribute("transform", `translate(${(qx + r.lado * 10).toFixed(1)} ${py.toFixed(1)})`); continue; }
      const al = r.lado > 0 ? "start" : "end", gx = r.lado * 5;
      r.corpo.setAttribute("transform", `translate(${qx.toFixed(1)} ${py.toFixed(1)})`);
      const topo = -r.alt / 2;
      r.tx.setAttribute("x", gx); r.tx.setAttribute("y", topo + 12); r.tx.setAttribute("text-anchor", al);
      r.sub.setAttribute("x", gx); r.sub.setAttribute("y", topo + 26); r.sub.setAttribute("text-anchor", al);
      const total = r.logos.length * 26 - 4;
      r.logos.forEach((a, i) => a.setAttribute("transform", `translate(${(r.lado > 0 ? gx : gx - total) + i * 26} ${topo + 32})`));
    }
    // fora da vista: uma etiqueta na borda, na direção do prédio
    for (const r of R) {
      r.fora.style.display = r.dentro ? "none" : "";
      if (r.dentro) continue;
      const [ax, ay] = r.A, dx = ax - W / 2, dy = ay - H / 2;
      const s = Math.min((W / 2 - 16) / Math.abs(dx || 1e-9), (H / 2 - 16) / Math.abs(dy || 1e-9));
      const seta = (dy < -Math.abs(dx) * 0.4 ? "↑" : dy > Math.abs(dx) * 0.4 ? "↓" : "") + (dx > Math.abs(dy) * 0.4 ? "→" : dx < -Math.abs(dy) * 0.4 ? "←" : "");
      r.foraTx.textContent = compacto ? `${r.l.n} ${seta}` : `${r.l.nome} ${seta}`;
      const w = r.foraTx.getComputedTextLength() + 20;
      r.foraFundo.setAttribute("width", w);
      r.caixa = { x: Math.min(W - w - 8, Math.max(8, W / 2 + dx * s - w / 2)), y: Math.min(H - 32, Math.max(8, H / 2 + dy * s - 12)), w };
    }
    // etiquetas na mesma borda não se sobrepõem: em cima e embaixo vão para o lado; nas laterais, para baixo
    const fora = R.filter((r) => !r.dentro).sort((a, b) => a.caixa.y - b.caixa.y || a.caixa.x - b.caixa.x);
    // os botões de zoom (canto de cima, à esquerda) e o norte (à direita) ficam livres
    for (const r of fora) { const c = r.caixa; if (c.y < 130 && c.x < 96) c.x = 96; if (c.y < 56 && c.x + c.w > W - 48) c.x = W - 48 - c.w; }
    G.todos.style.display = fora.length > 2 ? "" : "none";
    if (fora.length > 2) {
      fora.forEach((r) => { r.fora.style.display = "none"; });
      G.todosTx.textContent = `${fora.length} prédios fora da vista · ver todos`;
      const w = G.todosTx.getComputedTextLength() + 20;
      G.todosFundo.setAttribute("width", w);
      G.todos.setAttribute("aria-label", `Ver todos os prédios (${fora.length} estão fora da vista)`);
      G.todos.setAttribute("transform", `translate(${((W - w) / 2).toFixed(1)} ${H - 34})`);
      fora.length = 0;
    }
    for (let i = 0, voltas = 0; i < fora.length; i++, voltas = 0) for (let j = 0; j < i; j++) {
      const a = fora[j].caixa, b = fora[i].caixa;
      if (a.x < b.x + b.w + 6 && b.x < a.x + a.w + 6 && a.y < b.y + 30 && b.y < a.y + 30) {
        const lateral = b.x <= 10 || b.x + b.w >= W - 10;
        if (lateral) b.y = Math.min(H - 32, a.y + 30); else b.x = a.x + a.w + 6;
        if (b.x + b.w > W - 8) { b.x = 8; b.y = Math.min(H - 32, b.y + 30); }
        if (++voltas < 40) j = -1;   // confere de novo contra todas as anteriores (com limite, se faltar espaço)
      }
    }
    for (const r of fora) r.fora.setAttribute("transform", `translate(${r.caixa.x.toFixed(1)} ${r.caixa.y.toFixed(1)})`);
    // marcas das linhas de tempo a pé, na direção oés-sudoeste (onde há menos nomes)
    G.marcas.forEach((e, i) => {
      const th = -112 * GRAU, alvoM = formas.isocronas[i].min * M_POR_MIN;
      let lo = 0, hi = RAIO; for (let k = 0; k < 22; k++) { const m = (lo + hi) / 2; if (andado(m, th) < alvoM) lo = m; else hi = m; }
      const [x, y] = paraTela(posMundo([th, hi, alvoM]));
      e.setAttribute("x", x.toFixed(1)); e.setAttribute("y", y.toFixed(1));
      e.style.display = x < 20 || x > W - 20 || y < 12 || y > H - 8 ? "none" : "";
    });
    G.norte.setAttribute("transform", `translate(${W - 26} 30)`);
    // escala: só no mapa (no desenho em tempo a pé, as distâncias deixam de ser uniformes)
    const opcoes = [20, 50, 100, 200, 500, 1000], m = opcoes.find((v) => v * cam.z >= 70) || 1000, px = m * cam.z;
    G.escalaLinha.setAttribute("d", `M0 0 V-5 M0 0 H${px.toFixed(1)} V-5`);
    G.escalaTx.textContent = distancia(m);
    G.escala.setAttribute("transform", `translate(16 ${H - 14})`);
    G.escala.style.opacity = Math.max(0, 1 - te * 2);
  }

  function aplicarCamera() {
    mundo.setAttribute("transform", `matrix(${cam.z} 0 0 ${-cam.z} ${(W / 2 - cam.x * cam.z).toFixed(2)} ${(H / 2 + cam.y * cam.z).toFixed(2)})`);
    posicionarRotulos();
  }

  // enquadra todos os prédios da Poli menos a Química (que fica longe e ganha a etiqueta na borda)
  function enquadrar() {
    const pts = lugares.filter((l) => l.id !== "qui").flatMap((l) => (formas.poli[l.id] || []).flat().map((p) => posMundo(p)));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const folgaX = compacto ? 46 : 190, folgaY = compacto ? 40 : 70;
    const z = Math.min((W - 2 * folgaX) / (Math.max(...xs) - Math.min(...xs)), (H - 2 * folgaY) / (Math.max(...ys) - Math.min(...ys)));
    return { x: (Math.max(...xs) + Math.min(...xs)) / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, z: Math.min(zMax, Math.max(zMin, z)) };
  }
  const limitar = () => {
    cam.z = Math.min(zMax, Math.max(zMin, cam.z));
    const n = Math.hypot(cam.x, cam.y), lim = RAIO * 1.3;
    if (n > lim) { cam.x *= lim / n; cam.y *= lim / n; }
  };
  let voo = 0;
  function voar(destino, z = Math.max(cam.z, enquadrar().z * 0.9)) {
    cancelAnimationFrame(voo);
    const ini = { ...cam }, fim = { x: destino[0], y: destino[1], z }, t0 = performance.now();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { Object.assign(cam, fim); limitar(); aplicarCamera(); return; }
    const passo = (agora) => {
      const f = suave(Math.min(1, (agora - t0) / 550));
      cam.x = lerp(ini.x, fim.x, f); cam.y = lerp(ini.y, fim.y, f); cam.z = ini.z * (fim.z / ini.z) ** f;
      limitar(); aplicarCamera();
      if (f < 1) voo = requestAnimationFrame(passo);
    };
    voo = requestAnimationFrame(passo);
  }
  function zoomEm(fator, sx = W / 2, sy = H / 2) {
    const wx = cam.x + (sx - W / 2) / cam.z, wy = cam.y - (sy - H / 2) / cam.z;
    cam.z = Math.min(zMax, Math.max(zMin, cam.z * fator));
    cam.x = wx - (sx - W / 2) / cam.z; cam.y = wy + (sy - H / 2) / cam.z;
    limitar(); aplicarCamera();
  }

  function montar(manterCamera = false) {
    W = Math.round(quadro.clientWidth);
    compacto = W < 560;
    H = Math.round(Math.min(620, Math.max(380, W * (compacto ? 1.05 : 0.72))));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    zMin = Math.min(W, H) / (2.2 * RAIO); zMax = 4;
    if (compacto) caixaLista.open = true;
    montarRotulos();
    if (!manterCamera) Object.assign(cam, enquadrar());
    limitar(); aplicarCamera();
  }

  /* ---------- tempo a pé ---------- */
  function animar(para) {
    alvoT = para;
    botao.setAttribute("aria-pressed", String(para === 1));
    botao.textContent = para === 1 ? "Voltar à distância real" : "Ver em minutos a pé";
    legenda.textContent = LEGENDAS[para];
    cancelAnimationFrame(anim);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { t = para; desenharFormas(); posicionarRotulos(); return; }
    const ini = t, t0 = performance.now(), dur = 1300 * Math.abs(para - ini);
    const passo = (agora) => {
      const f = Math.min(1, (agora - t0) / dur);
      t = lerp(ini, para, f); desenharFormas(); posicionarRotulos();
      if (f < 1) anim = requestAnimationFrame(passo);
    };
    anim = requestAnimationFrame(passo);
  }
  legenda.textContent = LEGENDAS[0];
  botao.addEventListener("click", () => animar(alvoT === 1 ? 0 : 1));

  /* ---------- zoom e arrasto ---------- */
  const avisar = () => { quadro.classList.add("pb__quadro--dica"); clearTimeout(G.dicaT); G.dicaT = setTimeout(() => quadro.classList.remove("pb__quadro--dica"), 1800); };
  alvo.querySelector(".pb__zoom").addEventListener("click", (e) => {
    const b = e.target.closest("[data-zoom]"); if (!b) return;
    const v = +b.dataset.zoom;
    if (v === 0) { const e2 = enquadrar(); voar([e2.x, e2.y], e2.z); }
    else zoomEm(v > 0 ? 1.6 : 1 / 1.6);
  });
  svg.addEventListener("wheel", (e) => {
    if (!(e.ctrlKey || e.metaKey)) { avisar(); return; }
    e.preventDefault();
    const b = svg.getBoundingClientRect();
    zoomEm(Math.exp(-e.deltaY * 0.0022), e.clientX - b.left, e.clientY - b.top);
  }, { passive: false });
  svg.addEventListener("dblclick", (e) => { const b = svg.getBoundingClientRect(); zoomEm(1.8, e.clientX - b.left, e.clientY - b.top); });
  // mouse: arrastar move
  let arrasto = null;
  svg.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("a, .pb-fora")) return;
    arrasto = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; svg.setPointerCapture(e.pointerId); quadro.classList.add("is-arrastando");
  });
  svg.addEventListener("pointermove", (e) => {
    if (!arrasto) return;
    cam.x = arrasto.cx - (e.clientX - arrasto.x) / cam.z; cam.y = arrasto.cy + (e.clientY - arrasto.y) / cam.z; limitar(); aplicarCamera();
  });
  const soltar = () => { arrasto = null; quadro.classList.remove("is-arrastando"); };
  svg.addEventListener("pointerup", soltar); svg.addEventListener("pointercancel", soltar);
  // toque: um dedo rola a página; dois dedos movem e dão zoom
  let pinca = null;
  const meioToque = (ts) => { const b = svg.getBoundingClientRect(); return [(ts[0].clientX + ts[1].clientX) / 2 - b.left, (ts[0].clientY + ts[1].clientY) / 2 - b.top, Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY)]; };
  svg.addEventListener("touchstart", (e) => { if (e.touches.length === 1 && !e.target.closest("a, .pb-fora")) avisar(); if (e.touches.length === 2) { e.preventDefault(); const [x, y, d] = meioToque(e.touches); pinca = { x, y, d, cam: { ...cam } }; } }, { passive: false });
  svg.addEventListener("touchmove", (e) => {
    if (!pinca || e.touches.length !== 2) return;
    e.preventDefault();
    const [x, y, d] = meioToque(e.touches);
    const wx = pinca.cam.x + (pinca.x - W / 2) / pinca.cam.z, wy = pinca.cam.y - (pinca.y - H / 2) / pinca.cam.z;
    cam.z = Math.min(zMax, Math.max(zMin, pinca.cam.z * (d / pinca.d)));
    cam.x = wx - (x - W / 2) / cam.z; cam.y = wy + (y - H / 2) / cam.z;
    limitar(); aplicarCamera();
  }, { passive: false });
  svg.addEventListener("touchend", (e) => { if (e.touches.length < 2) pinca = null; });

  desenharFormas();
  montar();
  let espera;
  new ResizeObserver(() => { if (Math.abs(Math.round(quadro.clientWidth) - W) > 4) { clearTimeout(espera); espera = setTimeout(() => montar(true), 120); } }).observe(figura);
}
