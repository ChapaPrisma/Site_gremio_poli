// Guia dos circulares (aluno/circulares/): mapa das linhas que entram na Cidade Universitária, com os
// traçados, as paradas e os ônibus ao vivo, e um cartão por linha (BUSP, dias, horários, trajeto).
// - Traçados e paradas: assets/dados/circulares.json (ferramentas/circulares.mjs, do OpenStreetMap).
// - Informações das linhas: assets/js/dados/circulares.js.
// - Ao vivo: a função "onibus" do Supabase (ferramentas/supabase/funcoes/onibus), que consulta o Olho
//   Vivo da SPTrans. Se ela falhar, demorar ou devolver dados velhos, a página avisa que a localização
//   ao vivo não está funcionando e continua mostrando o mapa e as linhas normalmente.
// O mapa é o Leaflet com o OpenStreetMap, carregados só nesta página.
// Uso: marcação em aluno/circulares/index.html e <div data-componente="guia-circulares"></div>.

import { LINHAS, GRUPOS } from "../dados/circulares.js?v=202610141209";

const LEAFLET = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/";
const CENTRO = [-23.5615, -46.7262];
const INTERVALO = 20_000;          // de quanto em quanto tempo pergunta a posição dos ônibus
const VELHO = 3 * 60_000;          // posição com mais de 3 minutos é considerada parada no tempo
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function carregarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  const css = document.createElement("link");
  css.rel = "stylesheet"; css.href = LEAFLET + "leaflet.min.css?v=202610141209";
  document.head.appendChild(css);
  return new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = LEAFLET + "leaflet.min.js?v=202610141209";
    s.onload = () => ok(window.L); s.onerror = erro;
    document.head.appendChild(s);
  });
}

export default async function guiaCirculares(_alvo, { site, raiz }) {
  const caixaMapa = document.getElementById("mapaCirculares");
  if (!caixaMapa) return;
  const porRef = new Map(LINHAS.map((l) => [l.ref, l]));
  const estado = { ativas: new Set(LINHAS.map((l) => l.ref)) };

  /* ---------- cartões das linhas ---------- */
  const lista = document.getElementById("linhasCirculares");
  lista.innerHTML = GRUPOS.map((g) => `
    <section class="circ-grupo" aria-labelledby="circ-${g.id}">
      <div class="circ-grupo__topo"><h3 id="circ-${g.id}">${g.titulo}</h3><p>${g.texto}</p></div>
      <div class="circ-linhas">${g.refs.map((r) => porRef.get(r)).map((l) => `
        <article class="circ-linha" data-linha="${l.ref}" style="--cor:${l.cor}">
          <div class="circ-linha__topo">
            <span class="circ-linha__codigo">${l.ref}</span>
            ${l.busp ? `<span class="pill pill--aberto">BUSP</span>` : `<span class="pill">Paga</span>`}
            ${l.destaque ? `<span class="pill pill--breve">${l.destaque}</span>` : ""}
          </div>
          <h4>${l.nome}</h4>
          <p>${l.resumo}</p>
          <dl class="circ-linha__info"><div><dt>Quando</dt><dd>${l.dias}</dd></div><div><dt>Horário</dt><dd>${l.horario}</dd></div></dl>
          <p class="circ-linha__ao-vivo" data-ao-vivo="${l.ref}" hidden></p>
          <button type="button" class="chip" data-ver="${l.ref}">Ver no mapa</button>
        </article>`).join("")}</div>
    </section>`).join("");

  /* ---------- mapa ---------- */
  let L;
  try { L = await carregarLeaflet(); } catch {
    caixaMapa.innerHTML = `<p class="circ-mapa__erro">Não deu para carregar o mapa agora. As linhas continuam listadas abaixo.</p>`;
    return;
  }
  const mapa = L.map(caixaMapa, { zoomControl: true, scrollWheelZoom: false }).setView(CENTRO, 15);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: '&copy; colaboradores do <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mapa);
  mapa.on("focus", () => mapa.scrollWheelZoom.enable());
  mapa.on("blur", () => mapa.scrollWheelZoom.disable());

  const camadas = new Map();   // ref -> { tracado, paradas, onibus }
  let dados = { linhas: {} };
  try { dados = await (await fetch(new URL("assets/dados/circulares.json", raiz), { cache: "no-cache" })).json(); } catch {}

  for (const l of LINHAS) {
    const sentidos = dados.linhas[l.ref] || [];
    const tracado = L.layerGroup(sentidos.flatMap((s) => s.trechos.map((t) => L.polyline(t, { color: l.cor, weight: 5, opacity: .85 }))));
    const vistas = new Set();
    const paradas = L.layerGroup(sentidos.flatMap((s) => s.paradas).filter((p) => { const k = `${p.lat},${p.lon}`; if (vistas.has(k)) return false; vistas.add(k); return true; })
      .map((p) => L.circleMarker([p.lat, p.lon], { radius: 5, color: "#121735", weight: 2, fillColor: "#fff", fillOpacity: 1 })
        .bindPopup(`<b>${esc(p.nome || "Parada")}</b><br>Linha ${esc(l.ref)}`)));
    const onibus = L.layerGroup();
    camadas.set(l.ref, { tracado, paradas, onibus, temTracado: sentidos.length > 0 });
    tracado.addTo(mapa); paradas.addTo(mapa); onibus.addTo(mapa);
  }
  // Linhas sem traçado no mapa: o cartão diz isso, sem drama.
  for (const l of LINHAS) if (!camadas.get(l.ref).temTracado) {
    const b = lista.querySelector(`[data-ver="${l.ref}"]`);
    b.textContent = "Trajeto no mapa em breve"; b.disabled = true;
  }

  /* ---------- filtro por linha ---------- */
  const filtro = document.getElementById("filtroCirculares");
  filtro.innerHTML = `<button type="button" class="chip" data-filtro="todas" aria-pressed="true">Todas</button>` +
    LINHAS.filter((l) => camadas.get(l.ref).temTracado).map((l) => `<button type="button" class="chip circ-chip" data-filtro="${l.ref}" style="--cor:${l.cor}" aria-pressed="false">${l.ref}</button>`).join("");
  const mostrar = (refs) => {
    estado.ativas = new Set(refs);
    for (const [ref, c] of camadas) for (const k of ["tracado", "paradas", "onibus"]) (estado.ativas.has(ref) ? c[k].addTo(mapa) : c[k].remove());
    filtro.querySelectorAll("[data-filtro]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.filtro === "todas" ? refs.length === LINHAS.length : refs.length === 1 && refs[0] === b.dataset.filtro));
  };
  filtro.addEventListener("click", (e) => {
    const b = e.target.closest("[data-filtro]"); if (!b) return;
    mostrar(b.dataset.filtro === "todas" ? LINHAS.map((l) => l.ref) : [b.dataset.filtro]);
    if (b.dataset.filtro !== "todas") enquadrar(b.dataset.filtro);
  });
  const enquadrar = (ref) => {
    const g = camadas.get(ref)?.tracado; if (!g) return;
    const b = L.featureGroup(g.getLayers()).getBounds();
    if (b.isValid()) mapa.fitBounds(b, { padding: [24, 24] });
  };
  lista.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ver]"); if (!b || b.disabled) return;
    mostrar([b.dataset.ver]); enquadrar(b.dataset.ver);
    caixaMapa.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* ---------- ao vivo ---------- */
  const aviso = document.getElementById("avisoAoVivo"), selo = document.getElementById("seloAoVivo");
  const conta = site.contas || {};
  const endereco = conta.supabaseUrl ? `${conta.supabaseUrl}/functions/v1/onibus` : null;
  let falhas = 0;

  const situacao = (ok, texto) => {
    selo.classList.toggle("on", ok);
    selo.querySelector("span").textContent = texto;
    aviso.hidden = ok;
  };
  const icone = (cor) => L.divIcon({ className: "circ-onibus", html: `<span style="--cor:${cor}"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4S4 2.5 4 6v10zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM18 11H6V6h12v5z"/></svg></span>`, iconSize: [30, 30], iconAnchor: [15, 15] });

  async function atualizar() {
    if (!endereco) return situacao(false, "Localização ao vivo indisponível");
    try {
      const r = await fetch(endereco, { headers: { apikey: conta.supabaseChave, Authorization: `Bearer ${conta.supabaseChave}` }, signal: AbortSignal.timeout(12_000) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.motivo || "sem dados");
      const agora = Date.now();
      let total = 0, recentes = 0;
      for (const l of LINHAS) {
        const c = camadas.get(l.ref); c.onibus.clearLayers();
        const vs = (j.linhas?.[l.ref] || []).filter((v) => v.lat && v.lon);
        for (const v of vs) {
          const idade = v.em ? agora - Date.parse(v.em) : 0;
          total++; if (idade < VELHO) recentes++;
          L.marker([v.lat, v.lon], { icon: icone(l.cor), keyboard: false, opacity: idade < VELHO ? 1 : .45 })
            .bindPopup(`<b>Linha ${esc(l.ref)}</b><br>Ônibus ${esc(v.prefixo)}${v.acessivel ? " · acessível" : ""}<br>${idade < 60_000 ? "posição de agora há pouco" : `posição de ${Math.round(idade / 60_000)} min atrás`}`)
            .addTo(c.onibus);
        }
        const p = lista.querySelector(`[data-ao-vivo="${l.ref}"]`);
        if (p) { p.hidden = false; p.textContent = vs.length ? `${vs.length} ${vs.length === 1 ? "ônibus rodando" : "ônibus rodando"} agora` : "Nenhum ônibus desta linha rodando agora"; }
      }
      // Todos os ônibus com posição antiga: o rastreamento está parado, mesmo que a resposta tenha vindo.
      if (total && !recentes) throw new Error("posicoes-antigas");
      falhas = 0;
      situacao(true, `Ao vivo · atualizado às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      falhas++;
      lista.querySelectorAll("[data-ao-vivo]").forEach((p) => (p.hidden = true));
      for (const c of camadas.values()) c.onibus.clearLayers();
      situacao(false, "Localização ao vivo fora do ar");
    }
  }
  await atualizar();
  // Some da tela: para de perguntar; volta: pergunta na hora. Com falhas seguidas, pergunta com menos pressa.
  let relogio;
  const agendar = () => { clearTimeout(relogio); relogio = setTimeout(async () => { if (!document.hidden) await atualizar(); agendar(); }, falhas > 2 ? INTERVALO * 3 : INTERVALO); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) atualizar(); });
  agendar();
}
