// Mapa de problemas do campus (aluno/demandas/#mapa): bebedouros, banheiros, iluminação... marcados no mapa
// da Cidade Universitária, no estilo do Waze. Quem vê um problema manda uma foto, escolhe a natureza e escreve
// um texto curto; a localização do celular na hora do envio vira o lugar do problema. Antes de enviar, o
// mapa avisa se já há um registro a menos de PERTO metros, para apoiar ("eu também vi isso") em vez de repetir.
// Uso: <div data-componente="mapa-problemas"></div>
//
// Dados: os prédios e caminhos de assets/dados/campus-poli.json (OpenStreetMap) e os registros do Supabase
// (dados/problemas.js, ferramentas/supabase/problemas.sql). As fotos vão para um bucket privado: só a gestão
// vê, no portal interno. No mapa público aparecem categoria, texto, data, situação e apoios.

import { CATEGORIAS, SITUACOES, PERTO, carregarProblemas, distancia, iconeSvg } from "../dados/problemas.js?v=202610190720";
import { bienio } from "../dados/predios-poli.js?v=202610190720";
import { supabase } from "../dados/contas.js?v=202610190720";

const NS = "http://www.w3.org/2000/svg";
const GRAU = Math.PI / 180;
const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const lerp = (a, b, t) => a + (b - a) * t;
const paraMetros = (lat, lon) => [(lon - bienio.lon) * 111320 * Math.cos(bienio.lat * GRAU), (lat - bienio.lat) * 110540];
const paraLatLon = ([x, y]) => ({ lat: bienio.lat + y / 110540, lon: bienio.lon + x / (111320 * Math.cos(bienio.lat * GRAU)) });
const dataCurta = (iso) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const LIMITE_CAMPUS = 1300;   // metros do Biênio: mais longe que isso, o envio pede para marcar no mapa

// Lê a posição GPS gravada na foto (EXIF), para quando o celular não informa a localização na hora.
async function gpsDaFoto(arquivo) {
  try {
    const v = new DataView(await arquivo.slice(0, 256 * 1024).arrayBuffer());
    if (v.getUint16(0) !== 0xffd8) return null;
    let p = 2;
    while (p < v.byteLength - 4) {
      const marca = v.getUint16(p), tam = v.getUint16(p + 2);
      if (marca === 0xffe1 && v.getUint32(p + 4) === 0x45786966) {
        const t = p + 10, le = v.getUint16(t) === 0x4949;
        const u16 = (o) => v.getUint16(t + o, le), u32 = (o) => v.getUint32(t + o, le);
        const entradas = (ifd) => Array.from({ length: u16(ifd) }, (_, i) => ifd + 2 + i * 12);
        const gpsPtr = entradas(u32(4)).find((e) => u16(e) === 0x8825);
        if (gpsPtr == null) return null;
        const g = {};
        for (const e of entradas(u32(gpsPtr + 8))) {
          const tag = u16(e);
          if (tag === 1 || tag === 3) g[tag] = String.fromCharCode(v.getUint8(t + e + 8));
          if (tag === 2 || tag === 4) { const o = u32(e + 8); const r = (k) => u32(o + k * 8) / u32(o + k * 8 + 4); g[tag] = r(0) + r(1) / 60 + r(2) / 3600; }
        }
        if (g[2] == null || g[4] == null) return null;
        return { lat: g[1] === "S" ? -g[2] : g[2], lon: g[3] === "W" ? -g[4] : g[4] };
      }
      p += 2 + tam;
    }
  } catch {}
  return null;
}

// Foto reduzida (até 1280 px, JPEG): leve para o celular e para o banco, e sem os metadados da original.
async function reduzir(arquivo) {
  const img = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const k = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.72));
}

const localAgora = () => new Promise((ok) => {
  if (!navigator.geolocation) return ok(null);
  navigator.geolocation.getCurrentPosition((p) => ok({ lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy }), () => ok(null), { enableHighAccuracy: true, timeout: 15000, maximumAge: 20000 });
});

export default async function mapaProblemas(alvo, { url, site }) {
  alvo.innerHTML = `
    <div class="mp">
      <div class="mp__quadro">
        <svg class="mp__svg" role="img" aria-label="Mapa do campus com os problemas registrados"><rect class="mp-fundo" width="100%" height="100%"/><g class="mp-mundo"></g><g class="mp-pinos"></g></svg>
        <div class="mp__zoom" role="group" aria-label="Zoom do mapa">
          <button type="button" data-zoom="1" aria-label="Aproximar">+</button>
          <button type="button" data-zoom="-1" aria-label="Afastar">−</button>
        </div>
        <p class="mp__marcar" hidden>Toque no mapa onde está o problema</p>
        <div class="mp__balao" hidden></div>
      </div>
      <div class="mp__resumo" aria-live="polite"></div>
      <form class="formulario mp__form" id="mpForm" novalidate>
        <h3>Registrar um problema</h3>
        <fieldset class="campo">
          <legend>Qual é a natureza do problema?</legend>
          <div class="mp__categorias">${Object.entries(CATEGORIAS).map(([id, c], i) => `<label><input type="radio" name="categoria" value="${id}"${i === 0 ? " checked" : ""}><span>${iconeSvg(id, 26)}${esc(c.rotulo)}</span></label>`).join("")}</div>
        </fieldset>
        <div class="campo">
          <label for="mpFoto">Foto do problema</label>
          <input type="file" id="mpFoto" accept="image/*" capture="environment">
          <img class="mp__previa" alt="Prévia da foto" hidden>
        </div>
        <div class="campo">
          <label for="mpTexto">O que está acontecendo e onde, exatamente</label>
          <textarea id="mpTexto" name="texto" maxlength="500" rows="3" placeholder="Ex.: bebedouro do 2º andar do Biênio, perto da escada, sem água há uma semana."></textarea>
        </div>
        <div class="mp__local" aria-live="polite">
          <p class="mp__aviso-local"><b>A localização do seu celular na hora do envio vira o lugar do problema no mapa.</b> Por isso, envie de onde o problema está. Se o celular não informar a localização, você marca o lugar tocando no mapa.</p>
          <p class="mp__estado-local"></p>
          <div class="mp__botoes-local">
            <button type="button" class="chip" id="mpLocal">Usar a minha localização</button>
            <button type="button" class="chip" id="mpNoMapa">Marcar no mapa</button>
          </div>
        </div>
        <div class="mp__perto" hidden></div>
        <p class="formulario__erro" id="mpErro" role="alert" hidden></p>
        <div class="formulario__fim">
          <button class="botao" type="submit">Enviar ao Grêmio</button>
          <p>Não aparece nome de ninguém. A foto só é vista pela gestão do Grêmio; no mapa aparecem a natureza, o texto, a data e o lugar.</p>
        </div>
        <p class="ok-msg mp__ok" hidden></p>
      </form>
    </div>`;

  const $ = (s) => alvo.querySelector(s);
  const quadro = $(".mp__quadro"), svg = $(".mp__svg"), mundo = $(".mp-mundo"), pinos = $(".mp-pinos"), balao = $(".mp__balao");
  const form = $("#mpForm"), erro = $("#mpErro"), estadoLocal = $(".mp__estado-local"), perto = $(".mp__perto");

  /* ---------- base: prédios e caminhos ---------- */
  let campus = null;
  try { campus = await (await fetch(url("assets/dados/campus-poli.json"))).json(); } catch {}
  const el = (tag, attrs = {}, pai) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (pai) pai.appendChild(e); return e; };
  if (campus) {
    const d = (linhas, fechado) => linhas.map((l) => "M" + l.map((p) => p.join(" ")).join("L") + (fechado ? "Z" : "")).join("");
    el("path", { class: "mp-caminho", d: d(campus.caminhos) }, mundo);
    el("path", { class: "mp-predio", "fill-rule": "evenodd", d: d(campus.predios.outros.flat(), true) }, mundo);
    for (const [id, grupos] of Object.entries(campus.predios)) if (id !== "outros") el("path", { class: id.startsWith("bie") ? "mp-predio mp-predio--bienio" : "mp-predio mp-predio--poli", "fill-rule": "evenodd", d: d(grupos.flat(), true) }, mundo);
  }

  /* ---------- câmera (zoom e arrasto) ---------- */
  let W = 0, H = 0;
  const cam = { x: 120, y: 120, z: 1 };
  let zMin = 0.2, zMax = 5;
  const paraTela = ([x, y]) => [W / 2 + (x - cam.x) * cam.z, H / 2 - (y - cam.y) * cam.z];
  const paraMundo = (sx, sy) => [cam.x + (sx - W / 2) / cam.z, cam.y - (sy - H / 2) / cam.z];
  const limitar = () => { cam.z = Math.min(zMax, Math.max(zMin, cam.z)); const n = Math.hypot(cam.x, cam.y); if (n > 1300) { cam.x *= 1300 / n; cam.y *= 1300 / n; } };
  function aplicar() {
    mundo.setAttribute("transform", `matrix(${cam.z} 0 0 ${-cam.z} ${(W / 2 - cam.x * cam.z).toFixed(2)} ${(H / 2 + cam.y * cam.z).toFixed(2)})`);
    desenharPinos();
  }
  function medir(manter) {
    W = Math.round(quadro.clientWidth); H = Math.round(Math.min(560, Math.max(340, W * (W < 560 ? 1.05 : 0.62))));
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("width", W); svg.setAttribute("height", H);
    zMin = Math.min(W, H) / 2600;
    if (!manter) { cam.x = 120; cam.y = 120; cam.z = Math.min(W / 950, H / 800); }
    limitar(); aplicar();
  }
  const zoomEm = (f, sx = W / 2, sy = H / 2) => { const [wx, wy] = paraMundo(sx, sy); cam.z = Math.min(zMax, Math.max(zMin, cam.z * f)); cam.x = wx - (sx - W / 2) / cam.z; cam.y = wy + (sy - H / 2) / cam.z; limitar(); aplicar(); };
  $(".mp__zoom").addEventListener("click", (e) => { const b = e.target.closest("[data-zoom]"); if (b) zoomEm(+b.dataset.zoom > 0 ? 1.6 : 1 / 1.6); });
  svg.addEventListener("wheel", (e) => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); const b = svg.getBoundingClientRect(); zoomEm(Math.exp(-e.deltaY * 0.0022), e.clientX - b.left, e.clientY - b.top); }, { passive: false });
  let arrasto = null, moveu = 0;
  svg.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest(".mp-pino")) return; arrasto = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; moveu = 0; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener("pointermove", (e) => { if (!arrasto) return; moveu = Math.max(moveu, Math.hypot(e.clientX - arrasto.x, e.clientY - arrasto.y)); cam.x = arrasto.cx - (e.clientX - arrasto.x) / cam.z; cam.y = arrasto.cy + (e.clientY - arrasto.y) / cam.z; limitar(); aplicar(); });
  const soltar = () => { arrasto = null; };
  svg.addEventListener("pointerup", soltar); svg.addEventListener("pointercancel", soltar);
  let pinca = null;
  const meio = (ts) => { const b = svg.getBoundingClientRect(); return [(ts[0].clientX + ts[1].clientX) / 2 - b.left, (ts[0].clientY + ts[1].clientY) / 2 - b.top, Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY)]; };
  svg.addEventListener("touchstart", (e) => { if (e.touches.length === 2) { e.preventDefault(); const [x, y, d] = meio(e.touches); pinca = { x, y, d, cam: { ...cam } }; moveu = 99; } }, { passive: false });
  svg.addEventListener("touchmove", (e) => {
    if (!pinca || e.touches.length !== 2) return; e.preventDefault();
    const [x, y, d] = meio(e.touches), wx = pinca.cam.x + (pinca.x - W / 2) / pinca.cam.z, wy = pinca.cam.y - (pinca.y - H / 2) / pinca.cam.z;
    cam.z = Math.min(zMax, Math.max(zMin, pinca.cam.z * (d / pinca.d))); cam.x = wx - (x - W / 2) / cam.z; cam.y = wy + (y - H / 2) / cam.z; limitar(); aplicar();
  }, { passive: false });
  svg.addEventListener("touchend", (e) => { if (e.touches.length < 2) pinca = null; });

  /* ---------- registros ---------- */
  let problemas = [], banco = false;
  const st = await carregarProblemas(site);
  banco = st.ok; problemas = st.problemas;
  let rascunho = null;   // { lat, lon, precisao, origem } do problema que está sendo registrado
  // Enquanto o mapa não tem nenhum registro de verdade, um exemplo no Biênio mostra como um registro aparece.
  // Ele não conta no resumo, não recebe apoio e não entra no aviso de registro próximo.
  const EXEMPLO = { id: "exemplo", exemplo: true, criado_em: new Date().toISOString(), categoria: "agua", texto: "Bebedouro do térreo do Biênio sem água gelada.", lat: -23.55672, lon: -46.73262, situacao: "aberto", apoios: 0, resposta: null };
  const noMapa = () => (problemas.length ? problemas : [EXEMPLO]);
  let marcando = false;

  // pino no estilo do Waze: gota com o ícone da categoria; o tamanho não muda com o zoom
  function pino(g, [sx, sy], cat, extra = "") {
    const c = CATEGORIAS[cat] || CATEGORIAS.outro;
    const p = el("g", { class: `mp-pino ${extra}`, transform: `translate(${sx.toFixed(1)} ${sy.toFixed(1)})` }, g);
    el("path", { class: "mp-pino__gota", d: "M0 0 C-4 -9 -14 -14 -14 -25 a14 14 0 0 1 28 0 C14 -14 4 -9 0 0Z", fill: c.cor }, p);
    el("path", { d: c.icone, transform: "translate(0 -25) scale(.62) translate(-12 -12)", fill: "none", stroke: "#fff", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" }, p);
    return p;
  }
  function desenharPinos() {
    pinos.replaceChildren();
    for (const pr of noMapa()) {
      const p = pino(pinos, paraTela(paraMetros(pr.lat, pr.lon)), pr.categoria, pr.situacao === "resolvido" ? "is-resolvido" : pr.exemplo ? "is-exemplo" : "");
      p.setAttribute("tabindex", 0); p.setAttribute("role", "button");
      p.setAttribute("aria-label", `${CATEGORIAS[pr.categoria]?.rotulo || "Problema"}: ${pr.texto}`);
      const abrir = () => abrirBalao(pr); p.addEventListener("click", abrir);
      p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } });
    }
    if (rascunho) {
      const [sx, sy] = paraTela(paraMetros(rascunho.lat, rascunho.lon));
      if (rascunho.precisao) el("circle", { class: "mp-precisao", cx: sx, cy: sy, r: Math.max(6, rascunho.precisao * cam.z) }, pinos);
      pino(pinos, [sx, sy], form.categoria.value, "is-rascunho");
    }
    if (balao.dataset.id) posicionarBalao();
  }
  function abrirBalao(pr) {
    balao.dataset.id = pr.id;
    if (pr.exemplo) {
      balao.innerHTML = `<div class="mp__balao-topo">${iconeSvg(pr.categoria, 24)}<b>${esc(CATEGORIAS[pr.categoria].rotulo)}</b><span class="mp__selo-exemplo">Exemplo</span><button type="button" class="mp__fechar" aria-label="Fechar">×</button></div>
        <p>${esc(pr.texto)}</p>
        <p class="mp__balao-meta">Este é só um exemplo de como um registro aparece no mapa. Ele some quando o primeiro problema de verdade for registrado.</p>`;
      balao.hidden = false; posicionarBalao(); return;
    }
    balao.innerHTML = `<div class="mp__balao-topo">${iconeSvg(pr.categoria, 24)}<b>${esc(CATEGORIAS[pr.categoria]?.rotulo || "Problema")}</b><button type="button" class="mp__fechar" aria-label="Fechar">×</button></div>
      <p>${esc(pr.texto)}</p>
      <p class="mp__balao-meta">Registrado em ${dataCurta(pr.criado_em)} · ${esc(SITUACOES[pr.situacao] || "")}${pr.apoios ? ` · ${pr.apoios} ${pr.apoios === 1 ? "pessoa também viu" : "pessoas também viram"}` : ""}</p>
      ${pr.resposta ? `<p class="mp__balao-resposta"><b>Resposta do Grêmio:</b> ${esc(pr.resposta)}</p>` : ""}
      ${pr.situacao !== "resolvido" ? `<button type="button" class="chip" data-apoiar="${esc(pr.id)}" data-so-se-eleita>Eu também vi isso</button>` : ""}`;
    balao.hidden = false; posicionarBalao();
  }
  function posicionarBalao() {
    const pr = noMapa().find((x) => x.id === balao.dataset.id); if (!pr) { balao.hidden = true; return; }
    const [sx, sy] = paraTela(paraMetros(pr.lat, pr.lon)), w = balao.offsetWidth || 260, h = balao.offsetHeight || 120;
    if (sx < 0 || sx > W || sy < 0 || sy > H) { balao.hidden = true; delete balao.dataset.id; return; }   // o pino saiu da vista
    balao.style.left = `${Math.min(W - w - 8, Math.max(8, sx - w / 2))}px`;
    balao.style.top = `${sy - 34 - h > 8 ? sy - 34 - h : Math.min(H - h - 8, sy + 10)}px`;
  }
  async function apoiar(id, botao) {
    const db = await supabase(site); if (!db) return;
    const { data, error } = await db.rpc("apoiar_problema", { p_id: id });
    if (error) { botao.textContent = "Não deu agora, tente de novo"; return; }
    const pr = problemas.find((x) => x.id === id); if (pr) pr.apoios = data;
    botao.textContent = "Obrigado: apoio registrado"; botao.disabled = true;
    resumo();
  }
  balao.addEventListener("click", (e) => {
    if (e.target.closest(".mp__fechar")) { balao.hidden = true; delete balao.dataset.id; return; }
    const b = e.target.closest("[data-apoiar]"); if (b) apoiar(b.dataset.apoiar, b);
  });
  perto.addEventListener("click", (e) => { const b = e.target.closest("[data-apoiar]"); if (b) apoiar(b.dataset.apoiar, b); });

  // resumo por natureza: a pauta com dados para levar à diretoria da Poli
  function resumo() {
    const caixa = $(".mp__resumo");
    if (!banco) { caixa.innerHTML = `<p class="nota">O mapa começa a receber registros assim que o banco do Grêmio estiver ligado. O pino no Biênio é um exemplo de como um registro aparece: toque nele.</p>`; return; }
    const abertos = problemas.filter((p) => p.situacao !== "resolvido");
    if (!problemas.length) { caixa.innerHTML = `<p class="nota">Nenhum problema registrado ainda: o pino no Biênio é só um exemplo. O primeiro registro de verdade pode ser o seu.</p>`; return; }
    const conta = {};
    for (const p of abertos) conta[p.categoria] = (conta[p.categoria] || 0) + 1;
    const resolvidos = problemas.length - abertos.length;
    caixa.innerHTML = `<p><b>${abertos.length} problema${abertos.length === 1 ? "" : "s"} em aberto</b>${resolvidos ? ` e ${resolvidos} resolvido${resolvidos === 1 ? "" : "s"}` : ""}.</p>
      <ul class="mp__contagem">${Object.entries(conta).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<li>${iconeSvg(c, 20)}<span>${esc(CATEGORIAS[c]?.rotulo || c)}</span><b>${n}</b></li>`).join("")}</ul>`;
  }

  /* ---------- registrar ---------- */
  const textoLocal = (r) => r.origem === "mapa" ? "Lugar marcado no mapa." : r.origem === "foto" ? "Lugar tirado da foto (o celular não informou a localização)." : `Localização capturada${r.precisao ? ` (com precisão de uns ${Math.round(r.precisao)} m)` : ""}.`;
  function definirLocal(r) {
    const d = Math.hypot(...paraMetros(r.lat, r.lon));
    if (d > LIMITE_CAMPUS) { estadoLocal.textContent = "Você parece estar fora da Cidade Universitária. Toque em \"Marcar no mapa\" para indicar o lugar do problema."; rascunho = null; desenharPinos(); return false; }
    rascunho = r; estadoLocal.textContent = textoLocal(r);
    const [x, y] = paraMetros(r.lat, r.lon); cam.x = x; cam.y = y; cam.z = Math.max(cam.z, 1.6); limitar(); aplicar();
    mostrarPerto();
    return true;
  }
  function mostrarPerto() {
    if (!rascunho) { perto.hidden = true; return; }
    const proximos = problemas.filter((p) => p.situacao !== "resolvido" && distancia(rascunho, p) <= PERTO).sort((a, b) => distancia(rascunho, a) - distancia(rascunho, b));
    perto.hidden = !proximos.length;
    perto.innerHTML = proximos.length ? `<p><b>Perto daqui já registraram:</b> se for o mesmo problema, apoie o registro em vez de criar outro. Assim ele pesa mais na pauta.</p>
      <ul>${proximos.slice(0, 4).map((p) => `<li>${iconeSvg(p.categoria, 22)}<span><b>${esc(CATEGORIAS[p.categoria]?.rotulo || "")}</b>: ${esc(p.texto)} <small>(${Math.round(distancia(rascunho, p))} m daqui, em ${dataCurta(p.criado_em)}${p.apoios ? `, ${p.apoios} apoio${p.apoios === 1 ? "" : "s"}` : ""})</small></span><button type="button" class="chip" data-apoiar="${esc(p.id)}" data-so-se-eleita>É o mesmo: eu também vi</button></li>`).join("")}</ul>` : "";
  }
  $("#mpLocal").addEventListener("click", async () => {
    estadoLocal.textContent = "Pegando a sua localização…";
    const r = await localAgora();
    if (r) definirLocal({ ...r, origem: "gps" });
    else estadoLocal.textContent = "O celular não informou a localização (ela pode estar desligada ou bloqueada para o site). Toque em \"Marcar no mapa\".";
  });
  $("#mpNoMapa").addEventListener("click", () => { marcando = true; $(".mp__marcar").hidden = false; quadro.scrollIntoView({ behavior: "smooth", block: "center" }); });
  svg.addEventListener("click", (e) => {
    if (!marcando || moveu > 6 || e.target.closest(".mp-pino:not(.is-rascunho)")) return;
    const b = svg.getBoundingClientRect(), ll = paraLatLon(paraMundo(e.clientX - b.left, e.clientY - b.top));
    marcando = false; $(".mp__marcar").hidden = true;
    definirLocal({ ...ll, precisao: null, origem: "mapa" });
  });
  form.addEventListener("change", (e) => { if (e.target.name === "categoria") desenharPinos(); });
  $("#mpFoto").addEventListener("change", async (e) => {
    const f = e.target.files?.[0], img = $(".mp__previa");
    if (!f) { img.hidden = true; return; }
    img.src = URL.createObjectURL(f); img.hidden = false;
    // já pega o lugar: primeiro a localização do celular; se não vier, a gravada na foto
    if (!rascunho || rascunho.origem !== "mapa") {
      estadoLocal.textContent = "Pegando a sua localização…";
      const r = await localAgora();
      if (r) definirLocal({ ...r, origem: "gps" });
      else { const g = await gpsDaFoto(f); if (g) definirLocal({ ...g, precisao: null, origem: "foto" }); else estadoLocal.textContent = "O celular não informou a localização. Toque em \"Marcar no mapa\"."; }
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const categoria = form.categoria.value, texto = form.texto.value.trim(), foto = $("#mpFoto").files?.[0];
    const falha = (msg) => { erro.textContent = msg; erro.hidden = false; };
    erro.hidden = true;
    if (texto.length < 3) return falha("Conte em poucas palavras o que está acontecendo e onde.");
    // o lugar é o de onde se envia: tenta de novo a localização agora (menos quando foi marcado no mapa)
    if (!rascunho || rascunho.origem !== "mapa") { const r = await localAgora(); if (r && !definirLocal({ ...r, origem: "gps" })) return; }
    if (!rascunho) return falha("Falta o lugar do problema: use a sua localização ou marque no mapa.");
    const db = await supabase(site);
    if (!db || !banco) return falha("O mapa ainda não está recebendo registros. Tente de novo em breve.");
    const botao = form.querySelector("[type=submit]"); botao.disabled = true; botao.textContent = "Enviando…";
    try {
      const reg = { categoria, texto, lat: rascunho.lat, lon: rascunho.lon, precisao: rascunho.precisao ?? null, origem_local: rascunho.origem, tem_foto: !!foto };
      const { data, error } = await db.from("problemas").insert(reg).select("id, criado_em").single();
      if (error) throw new Error(/limite/.test(error.message) ? error.message.replace(/^.*limite: /, "") : "falha");
      if (foto) {
        const blob = await reduzir(foto);
        const up = await db.storage.from("problemas").upload(`${data.id}.jpg`, blob, { contentType: "image/jpeg", upsert: false });
        if (up.error) console.warn("foto não enviada", up.error.message);
      }
      problemas.unshift({ ...reg, ...data, situacao: "aberto", apoios: 0, resposta: null });
      rascunho = null; form.reset(); $(".mp__previa").hidden = true; perto.hidden = true; estadoLocal.textContent = "";
      desenharPinos(); resumo();
      const ok = $(".mp__ok"); ok.textContent = "Registrado. Obrigado! O seu problema já está no mapa, e a gestão do Grêmio recebe a foto."; ok.hidden = false;
    } catch (er) {
      falha(er.message && er.message !== "falha" ? `Não foi agora: ${er.message}.` : "Não deu para enviar agora. Confira a sua conexão e tente de novo.");
    }
    botao.disabled = false; botao.textContent = "Enviar ao Grêmio";
  });

  medir(false); resumo();
  let espera;
  new ResizeObserver(() => { if (Math.abs(Math.round(quadro.clientWidth) - W) > 4) { clearTimeout(espera); espera = setTimeout(() => medir(true), 120); } }).observe(alvo.querySelector(".mp"));
}
