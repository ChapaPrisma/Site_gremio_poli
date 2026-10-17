// "Onde fica cada engenharia" (Guia dos cursos): a Poli desenhada em escala, num disco com o Biênio no
// centro, e um botão que desenrola o desenho inteiro em coordenadas polares em volta do Biênio.
// Uso: <div data-componente="poli-do-bienio"></div>
//
// Cada ponto do desenho (x para leste, y para norte, em metros a partir do Biênio) vira (r, θ): r é a
// distância ao Biênio e θ a direção, medida a partir do norte no sentido horário (o corte fica no sul).
// No mapa, (r, θ) é desenhado como sempre; no modo polar, θ vira o eixo horizontal e r o vertical. A
// transição é contínua: os círculos em volta do Biênio vão se abrindo em arcos cada vez mais retos, em
// volta de um centro que desce até o infinito, até virarem linhas (ver projetar()). Por isso todo
// contorno é amostrado em pedaços curtos: reta no mapa vira curva no modo polar.
//
// Dados: dados/predios-poli.js (nomes, endereços, rótulos) e assets/dados/campus-poli.json (contornos
// do OpenStreetMap, gerado por ferramentas/campus_poli.py).

import { predios, bienio } from "../dados/predios-poli.js?v=202610170917";
import { centros } from "../dados/cursos.js?v=202610170917";

const NS = "http://www.w3.org/2000/svg";
const GRAU = Math.PI / 180;
const ANEIS = [250, 500, 750, 1000];
const DIRECOES = [["N", 0], ["NE", 45], ["L", 90], ["SE", 135], ["S", 180], ["SO", -135], ["O", -90], ["NO", -45], ["S", -180]];
const NOMES_DIRECAO = { N: "norte", NE: "nordeste", L: "leste", SE: "sudeste", S: "sul", SO: "sudoeste", O: "oeste", NO: "noroeste" };
const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const metros = (lat, lon) => [(lon - bienio.lon) * 111320 * Math.cos(bienio.lat * GRAU), (lat - bienio.lat) * 110540];
// θ a partir do norte, sentido horário; no corte do sul (x = 0, y < 0) o lado diz se é -180° ou +180°
const angulo = ([x, y], lado) => (x === 0 && y < 0 ? (lado < 0 ? -Math.PI : Math.PI) : Math.atan2(x, y));
const paraPolar = (p, lado) => [Math.hypot(p[0], p[1]), angulo(p, lado)];

// um segmento em metros, amostrado até cada pedaço ter no máximo 16 m e 2,5° vistos do Biênio
function amostrar(a, b, lado, saida, prof = 0) {
  const da = angulo(a, lado), db = angulo(b, lado);
  if (prof > 9 || (Math.hypot(b[0] - a[0], b[1] - a[1]) <= 16 && Math.abs(db - da) <= 2.5 * GRAU)) { saida.push(paraPolar(b, lado)); return; }
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  amostrar(a, m, lado, saida, prof + 1); amostrar(m, b, lado, saida, prof + 1);
}
function anelPolar(anel, lado, fechado = true) {
  const saida = [paraPolar(anel[0], lado)];
  const n = fechado ? anel.length : anel.length - 1;
  for (let i = 0; i < n; i++) amostrar(anel[i], anel[(i + 1) % anel.length], lado, saida);
  return saida;
}
const ladoDe = (aneis) => Math.sign(aneis[0].reduce((s, p) => s + p[0], 0)) || 1;
const voltaInteira = (r, n = 180) => Array.from({ length: n + 1 }, (_, k) => [r, -Math.PI + (2 * Math.PI * k) / n]);
// região de 0 até r(θ) em todas as direções (o disco, o Biênio): a borda e, de volta, o próprio centro
const regiaoEmVolta = (borda) => [...borda, ...borda.map(([, t]) => [0, t]).reverse()];

// borda do Biênio vista do centro: para cada direção, a distância até o contorno
function bordaEmVolta(anel, n = 240) {
  return voltaInteira(0, n).map(([, t]) => {
    const dx = Math.sin(t), dy = Math.cos(t); let melhor = Infinity;
    for (let i = 0; i < anel.length; i++) {
      const [x1, y1] = anel[i], [x2, y2] = anel[(i + 1) % anel.length];
      const ex = x2 - x1, ey = y2 - y1, det = ex * dy - ey * dx;
      if (Math.abs(det) < 1e-9) continue;
      const s = (ex * y1 - ey * x1) / det, u = (dx * y1 - dy * x1) / det;   // ponto = s·(dx, dy) = (x1, y1) + u·(ex, ey)
      if (s > 0 && u >= 0 && u <= 1) melhor = Math.min(melhor, s);
    }
    return [melhor === Infinity ? 0 : melhor, t];
  });
}

// quadriculado de 100 m, deslocado 50 m para nenhuma linha cair em cima do corte do sul
function quadriculado(R) {
  const linhas = [];
  for (let g = -R + 50; g < R; g += 100) {
    const h = Math.sqrt(R * R - g * g) - 1;
    const lado = Math.sign(g);
    linhas.push(anelPolar([[g, -h], [g, h]], lado, false));
    if (g < 0) { linhas.push(anelPolar([[-h, g], [0, g]], -1, false)); linhas.push(anelPolar([[0, g], [h, g]], 1, false)); }
    else linhas.push(anelPolar([[-h, g], [h, g]], 1, false));
  }
  return linhas;
}

const distancia = (m) => (m >= 995 ? `${(m / 1000).toFixed(1).replace(".0", "").replace(".", ",")} km` : `${Math.round(m / 10) * 10} m`);
function direcao(t) {
  const g = ((t / GRAU) + 360) % 360;
  return ["N", "NE", "L", "SE", "S", "SO", "O", "NO"][Math.round(g / 45) % 8];
}

export default async function poliDoBienio(alvo, { url }) {
  let dados;
  try { dados = await (await fetch(url("assets/dados/campus-poli.json"))).json(); }
  catch { alvo.innerHTML = `<p class="nota">Não deu para carregar o desenho dos prédios agora.</p>`; return; }

  const RAIO = dados.raio;
  const casPorId = Object.fromEntries(centros.map((c) => [c.id, c]));
  const lugares = predios.map((p, i) => {
    const [r, t] = paraPolar(metros(p.lat, p.lon), 1);
    return { ...p, n: i + 1, r, t, dir: direcao(t) };
  });

  // tudo em (r em metros, θ), pronto para projetar a cada quadro
  const formas = { disco: [regiaoEmVolta(voltaInteira(RAIO))], borda: [voltaInteira(RAIO)], aneis: ANEIS.map((r) => voltaInteira(r)),
    raios: DIRECOES.map(([, g]) => [[0, g * GRAU], [RAIO, g * GRAU]]), grade: quadriculado(RAIO), outros: [], poli: {} };
  for (const grupo of dados.predios.outros) { const lado = ladoDe(grupo); formas.outros.push(...grupo.map((a) => anelPolar(a, lado))); }
  for (const [id, grupos] of Object.entries(dados.predios)) {
    if (id === "outros") continue;
    formas.poli[id] = id === "bie"
      ? grupos.map((g) => regiaoEmVolta(bordaEmVolta(g[0])))
      : grupos.flatMap((g) => { const lado = ladoDe(g); return g.map((a) => anelPolar(a, lado)); });
  }

  alvo.innerHTML = `
    <figure class="pb">
      <div class="pb__quadro"><svg class="pb__svg" role="img" aria-labelledby="pbTitulo pbDesc">
        <title id="pbTitulo">Onde fica cada engenharia da Poli, com o Biênio no centro</title>
        <desc id="pbDesc">Desenho em escala dos prédios da Cidade Universitária num raio de ${distancia(RAIO)} do Biênio, com os prédios da Poli destacados. A lista abaixo traz os mesmos prédios, com distância, direção e endereço.</desc>
      </svg></div>
      <div class="pb__controle">
        <button type="button" class="botao botao--linha botao--pequeno pb__botao" aria-pressed="false">Desenrolar em coordenadas polares</button>
        <p class="pb__legenda" aria-live="polite"></p>
      </div>
      <details class="pb__lista-caixa">
        <summary>Endereço e departamentos de cada prédio</summary>
        <ol class="pb__lista">${lugares.map((l) => `<li>
          <span class="pb__n" aria-hidden="true">${l.n}</span>
          <div><b>${esc(l.nome)}</b> <span class="pb__dist">${l.id === "bie" ? "o centro do desenho" : `${distancia(l.r)} a ${NOMES_DIRECAO[l.dir]} do Biênio`}</span>
            <p>${esc(l.endereco)}. ${esc(l.deptos.length ? l.deptos.join("; ") : l.cursos)}.</p>
            ${l.cas.length ? `<p class="pb__cas">${l.cas.map((id) => `<a href="#${id}"><img src="${url(casPorId[id].logo)}" alt="" width="22" height="22" loading="lazy">${esc(casPorId[id].sigla)}</a>`).join("")}</p>` : ""}</div></li>`).join("")}</ol>
      </details>
    </figure>`;

  // a div do componente tem display: contents (largura 0): mede-se a figura
  const figura = alvo.querySelector(".pb");
  const svg = alvo.querySelector("svg"), botao = alvo.querySelector(".pb__botao"), legenda = alvo.querySelector(".pb__legenda");
  const caixaLista = alvo.querySelector(".pb__lista-caixa");
  const LEGENDAS = [
    `Em escala, com o norte para cima. Os anéis marcam ${ANEIS.map((a) => distancia(a)).join(", ").replace(/, ([^,]*)$/, " e $1")} a partir do Biênio.`,
    "O mesmo desenho em coordenadas polares em volta do Biênio: a direção virou o eixo horizontal e a distância, o vertical. O Biênio virou o chão, os anéis viraram retas e o quadriculado de 100 m se curvou.",
  ];

  let t = 0, alvoT = 0, anim = 0, largura = 0, G = null;

  // monta os elementos para a largura atual (textos em px de tela, então refaz quando a largura muda)
  function montar() {
    largura = Math.min(figura.clientWidth, 720);
    const compacto = largura < 520;
    const m = compacto ? 20 : 26, R = largura / 2 - m;
    G = { W: largura, m, R, s: R / RAIO, cx: largura / 2, cy: m + R, L: R / Math.PI, compacto };
    caixaLista.open = compacto || caixaLista.open;
    const el = (tag, attrs = {}, pai = svg) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); pai.appendChild(e); return e; };
    svg.querySelectorAll(":scope > :not(title, desc)").forEach((e) => e.remove());
    G.p = {
      disco: el("path", { class: "pb-disco" }),
      grade: el("path", { class: "pb-grade" }),
      aneis: el("path", { class: "pb-anel" }),
      raios: el("path", { class: "pb-raio" }),
      outros: el("path", { class: "pb-predio", "fill-rule": "evenodd" }),
      poli: Object.fromEntries(Object.keys(formas.poli).map((id) => [id, el("path", { class: `pb-poli pb-poli--${id.startsWith("bie") ? "bienio" : "eng"}`, "fill-rule": "evenodd", "data-id": id.replace("-anexo", "") })])),
      borda: el("path", { class: "pb-borda" }),
    };
    G.marcasAnel = ANEIS.filter((a) => a < RAIO).map((a) => { const e = el("text", { class: "pb-marca" }); e.textContent = distancia(a); return { a, e }; });
    G.direcoes = DIRECOES.map(([d, g]) => { const e = el("text", { class: "pb-direcao", "text-anchor": "middle" }); e.textContent = d; return { g, e }; });
    G.rotulos = lugares.map((l) => {
      const g = el("g", { class: "pb-rotulo", "data-id": l.id });
      const linha = el("line", { class: "pb-guia" }, g);
      const corpo = el("g", {}, g);
      if (compacto) {
        el("circle", { r: 10, class: "pb-num" }, corpo);
        const n = el("text", { class: "pb-num__t", "text-anchor": "middle", y: 4 }, corpo); n.textContent = l.n;
      } else {
        const tx = el("text", { class: "pb-nome" }, corpo); tx.textContent = l.nome;
        const sub = el("text", { class: "pb-sub" }, corpo); sub.textContent = l.id === "bie" ? "o centro do desenho" : `${distancia(l.r)} a ${l.dir}`;
        const logos = l.cas.map((id) => {
          const a = el("a", { href: `#${id}`, "aria-label": `Ir até o ${casPorId[id].sigla}` }, corpo);
          el("image", { href: url(casPorId[id].logo), width: 22, height: 22, class: "pb-logo" }, a);
          el("rect", { width: 22, height: 22, rx: 4, class: "pb-logo__aro" }, a);
          return a;
        });
        return { l, g, linha, corpo, tx, sub, logos };
      }
      return { l, g, linha, corpo };
    });
    // passar o mouse num rótulo acende o prédio
    G.rotulos.forEach(({ l, g }) => {
      const acende = (on) => svg.querySelectorAll(`.pb-poli[data-id="${l.id}"]`).forEach((p) => p.classList.toggle("is-ativo", on));
      g.addEventListener("pointerenter", () => acende(true)); g.addEventListener("pointerleave", () => acende(false));
    });
    desenhar(t);
  }

  // (r em metros, θ) -> tela, no instante tt (0 = mapa, 1 = polar)
  function projetor(tt) {
    const { R, s, cx, cy, L } = G;
    const a = 1 - tt, reto = a < 1e-6, c = reto ? 0 : (L * tt) / a;
    // escala para o desenho nunca passar da largura durante a transição
    const maxX = reto ? R : (a >= 0.5 ? R + c : (R + c) * Math.sin(Math.PI * a));
    const k = Math.min(1, R / maxX);
    const proj = (rm, th) => {
      const r = rm * s;
      if (reto) return [cx + th * L, cy - r];
      const u = th * a;
      return [cx + k * (r + c) * Math.sin(u), cy - k * (r * Math.cos(u) - 2 * c * Math.sin(u / 2) ** 2)];
    };
    let minY = 0;
    for (let i = 0; i <= 40; i++) for (const r of [0, RAIO]) minY = Math.min(minY, cy - proj(r, (Math.PI * i) / 40)[1]);
    return { proj, fundo: -minY };
  }

  function desenhar(tt) {
    const te = suave(tt);
    const { proj, fundo } = projetor(te);
    const { W, m, cy, R, compacto } = G;
    const caminho = (aneis, fechado = true) => aneis.map((anel) => "M" + anel.map(([r, th]) => proj(r, th).map((v) => v.toFixed(1)).join(" ")).join("L") + (fechado ? "Z" : "")).join("");
    G.p.disco.setAttribute("d", caminho(formas.disco));
    G.p.grade.setAttribute("d", caminho(formas.grade, false));
    G.p.aneis.setAttribute("d", caminho(formas.aneis, false));
    G.p.raios.setAttribute("d", caminho(formas.raios, false));
    G.p.outros.setAttribute("d", caminho(formas.outros));
    for (const id in G.p.poli) G.p.poli[id].setAttribute("d", caminho(formas.poli[id]));
    G.p.borda.setAttribute("d", caminho(formas.borda, false));

    const H = cy + Math.max(fundo, 0) + lerp(m, 34, te);
    svg.setAttribute("viewBox", `0 0 ${W} ${H.toFixed(1)}`);
    svg.setAttribute("width", W); svg.setAttribute("height", H.toFixed(1));

    // marcas dos anéis na direção oés-sudoeste, onde há menos nomes
    G.marcasAnel.forEach(({ a, e }) => { const [x, y] = proj(a, -112.5 * GRAU); e.setAttribute("x", x.toFixed(1)); e.setAttribute("y", (y - 4).toFixed(1)); });
    // letras das direções: em volta do disco no mapa, embaixo do chão no modo polar
    G.direcoes.forEach(({ g, e }) => {
      const a0 = [G.cx + (R + m * 0.55) * Math.sin(g * GRAU), cy - (R + m * 0.55) * Math.cos(g * GRAU) + 4];
      const a1 = [G.cx + (g * GRAU) * G.L, cy + 22];
      e.setAttribute("x", lerp(a0[0], a1[0], te).toFixed(1)); e.setAttribute("y", lerp(a0[1], a1[1], te).toFixed(1));
      // as letras somem no meio da transição (não têm um lugar natural entre o disco e a faixa)
      const visivel = Math.min(1, Math.max(0, (Math.abs(2 * te - 1) - 0.4) / 0.6));
      e.style.opacity = g === -180 && te < 0.5 ? 0 : visivel;   // o segundo "S" só existe na faixa
    });

    G.rotulos.forEach((rot) => {
      const { l, g, linha, corpo } = rot;
      const [ax, ay] = proj(l.r, l.t);
      // no celular só o número, mais perto do prédio (os mesmos desvios, em escala menor)
      const f = compacto ? 0.36 : 1;
      const [dx0, dy0, al0] = l.rotulo.mapa, [dx1, dy1, al1] = l.rotulo.polar;
      const lx = ax + lerp(dx0, dx1, te) * f, ly = ay + lerp(dy0, dy1, te) * f, al = te < 0.5 ? al0 : al1;
      linha.setAttribute("x1", ax.toFixed(1)); linha.setAttribute("y1", ay.toFixed(1));
      linha.setAttribute("x2", lx.toFixed(1)); linha.setAttribute("y2", ly.toFixed(1));
      corpo.setAttribute("transform", `translate(${lx.toFixed(1)} ${ly.toFixed(1)})`);
      if (compacto) return;
      const gx = al === "end" ? -6 : al === "start" ? 6 : 0;
      const acima = al === "middle" && (te < 0.5 ? dy0 : dy1) < 0;
      const y0 = al === "middle" ? (acima ? -24 - (rot.logos.length ? 26 : 0) : 16) : 4;
      rot.tx.setAttribute("x", gx); rot.tx.setAttribute("y", y0); rot.tx.setAttribute("text-anchor", al);
      rot.sub.setAttribute("x", gx); rot.sub.setAttribute("y", y0 + 15); rot.sub.setAttribute("text-anchor", al);
      const total = rot.logos.length * 26 - 4;
      const x0 = al === "end" ? gx - total : al === "start" ? gx : -total / 2;
      rot.logos.forEach((a, i) => a.setAttribute("transform", `translate(${x0 + i * 26} ${y0 + 22})`));
    });
  }

  function animar(para) {
    alvoT = para;
    botao.setAttribute("aria-pressed", String(para === 1));
    botao.textContent = para === 1 ? "Enrolar de volta no mapa" : "Desenrolar em coordenadas polares";
    legenda.textContent = LEGENDAS[para];
    cancelAnimationFrame(anim);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { t = para; desenhar(t); return; }
    const ini = t, inicio = performance.now(), dur = 1500 * Math.abs(para - ini);
    const passo = (agora) => {
      const f = Math.min(1, (agora - inicio) / dur);
      t = lerp(ini, para, f); desenhar(t);
      if (f < 1) anim = requestAnimationFrame(passo);
    };
    anim = requestAnimationFrame(passo);
  }

  legenda.textContent = LEGENDAS[0];
  botao.addEventListener("click", () => animar(alvoT === 1 ? 0 : 1));
  montar();
  let espera;
  new ResizeObserver(() => { if (Math.abs(Math.min(figura.clientWidth, 720) - largura) > 4) { clearTimeout(espera); espera = setTimeout(montar, 120); } }).observe(figura);
}
