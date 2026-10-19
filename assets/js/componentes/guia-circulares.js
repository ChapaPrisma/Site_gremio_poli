// Guia dos circulares (aluno/circulares/): à esquerda, a lista das linhas que entram na Cidade
// Universitária; à direita, o mapa. A linha escolhida fica em destaque no mapa (as outras, apagadas)
// e os detalhes dela aparecem embaixo da lista. Começa pelo 8084, o que passa na Poli.
// - Traçados e paradas: assets/dados/circulares.json, do GTFS oficial da SPTrans (ferramentas/circulares_gtfs.py).
// - Informações das linhas: assets/js/dados/circulares.js.
// - Ao vivo: a função "onibus" do Supabase (ferramentas/supabase/funcoes/onibus), que consulta o Olho
//   Vivo da SPTrans. Se ela falhar, demorar ou devolver posições velhas, uma faixa sobre o mapa avisa
//   que a localização ao vivo não está funcionando, e o resto da página segue normal.
// Mapa: Leaflet, carregado só nesta página. O fundo vem do OpenStreetMap; se os quadrados dele não
// carregarem (servidor lento ou bloqueado), o mapa troca sozinho para a próxima fonte da lista FUNDOS.
// Uso: marcação em aluno/circulares/index.html e <div data-componente="guia-circulares"></div>.

import { LINHAS, GRUPOS } from "../dados/circulares.js?v=202610190042";

const CDN = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
const INICIAL = "8084-10";
const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>';
const FUNDOS = [
  { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", opcoes: { maxZoom: 19, attribution: OSM } },
  { url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", opcoes: { maxZoom: 19, subdomains: "abc", attribution: OSM + ", estilo HOT (OSM França)" } },
  { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", opcoes: { maxZoom: 19, attribution: "Mapa &copy; Esri e fontes" } },
];
const INTERVALO = 20_000;
const VELHO = 3 * 60_000;
// paradas que ficam na porta de um prédio da Poli (aparecem em negrito na lista)
const POLI = new Set(["Biênio", "Parada Civil", "Metalurgia", "Mecânica I", "Mecânica II", "Hidráulica"]);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function carregarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = CDN + "leaflet.min" + ".css";
  document.head.appendChild(css);
  return new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = CDN + "leaflet.min" + ".js";
    s.onload = () => ok(window.L); s.onerror = erro;
    document.head.appendChild(s);
  });
}

export default async function guiaCirculares(_alvo, { site, raiz }) {
  const caixaMapa = document.getElementById("mapaCirculares");
  if (!caixaMapa) return;
  const porRef = new Map(LINHAS.map((l) => [l.ref, l]));
  let atual = INICIAL;
  const vivo = new Map();   // ref -> número de ônibus rodando agora (quando o ao vivo funciona)

  let dados = { linhas: {} };
  try { dados = await (await fetch(new URL("assets/dados/circulares.json", raiz), { cache: "no-cache" })).json(); } catch {}
  const temTracado = (ref) => (dados.linhas[ref] || []).length > 0;

  /* ---------- lista das linhas ---------- */
  const lista = document.getElementById("linhasCirculares");
  lista.innerHTML = GRUPOS.map((g) => `
    <div class="circ-grupo">
      <p class="circ-grupo__titulo">${g.titulo}<small>${g.texto}</small></p>
      <ul>${g.refs.map((r) => porRef.get(r)).map((l) => `
        <li><button type="button" class="circ-item" data-linha="${l.ref}" style="--cor:${l.cor}" aria-pressed="false">
          <i aria-hidden="true"></i>
          <span class="circ-item__texto"><b>${l.ref}</b><span>${esc(l.nome)}</span></span>
          ${l.busp ? `<span class="circ-item__busp">BUSP</span>` : ""}
        </button></li>`).join("")}</ul>
    </div>`).join("");
  const detalhe = document.getElementById("detalheCircular");
  // a lista de paradas de cada sentido (as linhas longas só no trecho do campus até o Metrô Butantã)
  const paradasDe = (ref) => {
    const sentidos = (dados.linhas[ref] || []).filter((s) => s.paradas.length);
    if (!sentidos.length) return "";
    const total = new Set(sentidos.flatMap((s) => s.paradas.map((p) => p.nome))).size;
    return `<details class="circ-paradas"><summary>As ${total} paradas</summary>${sentidos.map((s) => `
      ${sentidos.length > 1 ? `<p class="circ-paradas__sentido">Sentido ${esc(s.para || "")}</p>` : ""}
      <ol>${s.paradas.map((p) => `<li${POLI.has(p.nome) ? ` class="poli"` : ""}>${esc(p.nome)}</li>`).join("")}</ol>`).join("")}</details>`;
  };
  const desenharDetalhe = () => {
    const l = porRef.get(atual);
    const n = vivo.get(atual);
    detalhe.style.setProperty("--cor", l.cor);
    detalhe.innerHTML = `
      <div class="circ-detalhe__topo"><span class="circ-detalhe__codigo">${l.ref}</span>${l.busp ? `<span class="pill pill--aberto">Grátis com o BUSP</span>` : `<span class="pill">Paga</span>`}${l.destaque ? `<span class="pill pill--breve">${l.destaque}</span>` : ""}</div>
      <h3>${esc(l.nome)}</h3>
      <p>${esc(l.resumo)}</p>
      <dl><div><dt>Quando</dt><dd>${esc(l.dias)}</dd></div><div><dt>Horário</dt><dd>${esc(l.horario)}</dd></div>${l.intervalo ? `<div><dt>Intervalo</dt><dd>${esc(l.intervalo)}</dd></div>` : ""}</dl>
      ${paradasDe(l.ref)}
      ${n != null ? `<p class="circ-detalhe__vivo">${n ? `${n} ônibus rodando agora` : "Nenhum ônibus desta linha rodando agora"}</p>` : ""}
      ${temTracado(l.ref) ? "" : `<p class="circ-detalhe__nota">O trajeto desta linha ainda não está desenhado no mapa.</p>`}`;
  };

  /* ---------- mapa ---------- */
  let L = null;
  try { L = await carregarLeaflet(); } catch {
    caixaMapa.innerHTML = `<p class="circ-mapa__erro">Não deu para carregar o mapa agora. As linhas continuam na lista.</p>`;
  }
  const camadas = new Map();
  let mapa = null;
  if (L) {
    mapa = L.map(caixaMapa, { zoomControl: true, scrollWheelZoom: false, zoomSnap: .25 }).setView([-23.5615, -46.7262], 15);
    // fundo com reserva: muitas falhas e nenhum quadrado carregado, passa para a próxima fonte
    const fundo = (i) => {
      const camada = L.tileLayer(FUNDOS[i].url, FUNDOS[i].opcoes).addTo(mapa);
      let erros = 0, ok = 0;
      camada.on("tileload", () => ok++);
      camada.on("tileerror", () => { if (++erros >= 4 && !ok && i + 1 < FUNDOS.length) { mapa.removeLayer(camada); fundo(i + 1); } });
      setTimeout(() => { if (!ok && i + 1 < FUNDOS.length && mapa.hasLayer(camada)) { mapa.removeLayer(camada); fundo(i + 1); } }, 8000);
    };
    fundo(0);
    mapa.on("focus", () => mapa.scrollWheelZoom.enable());
    mapa.on("blur", () => mapa.scrollWheelZoom.disable());
    for (const l of LINHAS) {
      const sentidos = dados.linhas[l.ref] || [];
      const trechos = sentidos.flatMap((s) => s.trechos.map((t) => L.polyline(t, { color: l.cor, weight: 3, opacity: .18 })));
      const vistas = new Set();
      const paradas = sentidos.flatMap((s) => s.paradas).filter((p) => { const k = `${p.lat},${p.lon}`; if (vistas.has(k)) return false; vistas.add(k); return true; })
        .map((p) => L.circleMarker([p.lat, p.lon], { radius: 5, color: l.cor, weight: 3, fillColor: "#fff", fillOpacity: 1 }).bindTooltip(esc(p.nome || "Parada"), { direction: "top", offset: [0, -4] }));
      camadas.set(l.ref, { linhas: L.featureGroup(trechos).addTo(mapa), trechos, paradas: L.layerGroup(paradas), onibus: L.layerGroup().addTo(mapa) });
    }
  }

  const escolher = (ref, enquadrar = true) => {
    atual = ref;
    lista.querySelectorAll(".circ-item").forEach((b) => b.setAttribute("aria-pressed", b.dataset.linha === ref));
    desenharDetalhe();
    if (!mapa) return;
    for (const [r, c] of camadas) {
      const ativa = r === ref;
      c.trechos.forEach((t) => t.setStyle({ weight: ativa ? 6 : 3, opacity: ativa ? .95 : .18 }));
      if (ativa) { c.linhas.bringToFront(); c.paradas.addTo(mapa); } else c.paradas.remove();
      c.onibus.eachLayer((m) => m.setOpacity(ativa ? 1 : .35));
    }
    if (enquadrar) enquadrarLinha();
  };
  function enquadrarLinha() {
    const b = camadas.get(atual)?.linhas.getBounds();
    if (b && b.isValid()) { mapa.invalidateSize(); mapa.fitBounds(b, { padding: caixaMapa.clientWidth < 500 ? [10, 10] : [28, 28], maxZoom: 16 }); }
  }
  lista.addEventListener("click", (e) => {
    const b = e.target.closest(".circ-item"); if (!b) return;
    escolher(b.dataset.linha);
    if (matchMedia("(max-width: 900px)").matches) caixaMapa.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  escolher(INICIAL);
  // o tamanho da caixa do mapa só assenta depois que o CSS do Leaflet e a página terminam de carregar;
  // quando ele muda, a linha escolhida é enquadrada de novo
  if (mapa) { let medida = ""; new ResizeObserver(() => { const m = `${caixaMapa.clientWidth}x${caixaMapa.clientHeight}`; if (m !== medida) { medida = m; enquadrarLinha(); } }).observe(caixaMapa); }

  /* ---------- ao vivo ---------- */
  const faixa = document.getElementById("avisoAoVivo"), selo = document.getElementById("seloAoVivo");
  const conta = site.contas || {};
  const endereco = conta.supabaseUrl ? `${conta.supabaseUrl}/functions/v1/onibus` : null;
  let falhas = 0;
  const situacao = (ok, texto) => { selo.classList.toggle("on", ok); selo.querySelector("span").textContent = texto; faixa.hidden = ok; };
  const icone = (cor) => L.divIcon({ className: "circ-onibus", html: `<span style="--cor:${cor}"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4S4 2.5 4 6v10zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18 11H6V6h12v5z"/></svg></span>`, iconSize: [28, 28], iconAnchor: [14, 14] });

  async function atualizar() {
    try {
      if (!endereco || !L) throw new Error("indisponível");
      const r = await fetch(endereco, { headers: { apikey: conta.supabaseChave, Authorization: `Bearer ${conta.supabaseChave}` }, signal: AbortSignal.timeout(12_000) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.motivo || "sem dados");
      const agora = Date.now();
      let total = 0, recentes = 0;
      for (const l of LINHAS) {
        const vs = (j.linhas?.[l.ref] || []).filter((v) => v.lat && v.lon);
        vivo.set(l.ref, vs.length);
        const c = camadas.get(l.ref); if (!c) continue;
        c.onibus.clearLayers();
        for (const v of vs) {
          const idade = v.em ? agora - Date.parse(v.em) : 0;
          total++; if (idade < VELHO) recentes++;
          L.marker([v.lat, v.lon], { icon: icone(l.cor), keyboard: false, opacity: l.ref === atual ? 1 : .35 })
            .bindTooltip(`Linha ${esc(l.ref)}${v.acessivel ? " · acessível" : ""} · ${idade < 60_000 ? "agora" : `há ${Math.round(idade / 60_000)} min`}`)
            .addTo(c.onibus);
        }
      }
      if (total && !recentes) throw new Error("posicoes-antigas");
      falhas = 0;
      situacao(true, `Ao vivo · ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      falhas++;
      vivo.clear();
      for (const c of camadas.values()) c.onibus.clearLayers();
      situacao(false, "Ao vivo fora do ar");
    }
    desenharDetalhe();
  }
  await atualizar();
  let relogio;
  const agendar = () => { clearTimeout(relogio); relogio = setTimeout(async () => { if (!document.hidden) await atualizar(); agendar(); }, falhas > 2 ? INTERVALO * 3 : INTERVALO); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizar(); });
  agendar();
}
