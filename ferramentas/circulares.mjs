// Gera assets/dados/circulares.json com o traçado e as paradas das linhas de ônibus que entram na
// Cidade Universitária, a partir do OpenStreetMap (API Overpass, sem cadastro). As informações de
// cada linha (BUSP, dias e horários, de onde a onde) ficam em assets/js/dados/circulares.js; este
// arquivo traz só o desenho no mapa. Linhas que ainda não estão no OpenStreetMap aparecem na página
// sem o traçado. Roda em qualquer servidor com Node 18+: `node ferramentas/circulares.mjs`.
// Quando houver o GTFS oficial da SPTrans, ele pode substituir esta fonte (traçado de todas as linhas).

import { writeFile, readFile, readdir } from "node:fs/promises";

// Relações de rota no OpenStreetMap (uma por sentido). Para incluir uma linha, acrescente aqui.
const RELACOES = {
  "8012-10": [2277950, 2302353],
  "8022-10": [2432990, 2432989],
  "177H-10": [2510894, 3309999],
  "280BI1": [14064374, 14064375],
};
const SAIDA = new URL("../assets/dados/circulares.json", import.meta.url);
const arred = (v) => Math.round(v * 1e5) / 1e5;
// Região mostrada no mapa: a Cidade Universitária e o caminho até o Metrô Butantã. Linhas longas
// (como a 177H e a 280BI1) aparecem só neste trecho; o card diz até onde elas seguem.
const AREA = { sul: -23.5790, norte: -23.5420, oeste: -46.7520, leste: -46.6990 };
const dentro = ([lat, lon]) => lat >= AREA.sul && lat <= AREA.norte && lon >= AREA.oeste && lon <= AREA.leste;
// Corta um trecho nos pedaços que ficam dentro da área.
const recorta = (trecho) => {
  const pedacos = []; let atual = [];
  for (const p of trecho) { if (dentro(p)) atual.push(p); else { if (atual.length > 1) pedacos.push(atual); atual = []; } }
  if (atual.length > 1) pedacos.push(atual);
  return pedacos;
};

const ids = Object.values(RELACOES).flat();
const consulta = `[out:json][timeout:120];relation(id:${ids.join(",")});out geom;`;
const r = await fetch("https://overpass-api.de/api/interpreter", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "SiteGremioPolitecnico/1.0 (guia dos circulares)" },
  body: "data=" + encodeURIComponent(consulta),
  signal: AbortSignal.timeout(150_000),
});
if (!r.ok) throw new Error(`Overpass: HTTP ${r.status}`);
const { elements } = await r.json();
const porId = new Map(elements.map((e) => [e.id, e]));

const linhas = {};
for (const [ref, rels] of Object.entries(RELACOES)) {
  linhas[ref] = rels.map((id) => {
    const rel = porId.get(id);
    if (!rel) throw new Error(`Relação ${id} (${ref}) não veio do Overpass`);
    // Traçado: cada via da rota vira um trecho (não precisa ordenar para desenhar no mapa).
    const trechos = rel.members.filter((m) => m.type === "way" && !/platform|stop/.test(m.role) && m.geometry)
      .flatMap((m) => recorta(m.geometry.map((p) => [arred(p.lat), arred(p.lon)])));
    // Paradas: os pontos marcados como parada ou plataforma, sem repetir nomes muito próximos.
    const paradas = [];
    for (const m of rel.members) {
      if (m.type !== "node" || !/stop|platform/.test(m.role) || m.lat == null) continue;
      const p = { lat: arred(m.lat), lon: arred(m.lon) };
      if (!dentro([p.lat, p.lon])) continue;
      if (paradas.some((q) => Math.abs(q.lat - p.lat) < 0.0004 && Math.abs(q.lon - p.lon) < 0.0004)) continue;
      paradas.push(p);
    }
    return { nome: rel.tags.name || ref, de: rel.tags.from || "", para: rel.tags.to || "", trechos, paradas };
  }).filter((s) => s.trechos.length);   // rota incompleta no OpenStreetMap: a linha fica sem traçado
  if (!linhas[ref].length) delete linhas[ref];
}

// Nomes das paradas: vêm das próprias paradas no OpenStreetMap (segunda consulta, só dos pontos).
const pontos = elements.flatMap((e) => e.members.filter((m) => m.type === "node" && /stop|platform/.test(m.role)).map((m) => m.ref));
if (pontos.length) {
  const r2 = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", "User-Agent": "SiteGremioPolitecnico/1.0 (guia dos circulares)" },
    body: "data=" + encodeURIComponent(`[out:json][timeout:90];node(id:${[...new Set(pontos)].join(",")});out;`),
    signal: AbortSignal.timeout(120_000),
  });
  if (r2.ok) {
    const nos = new Map((await r2.json()).elements.map((n) => [`${arred(n.lat)},${arred(n.lon)}`, n.tags?.name]));
    for (const sentidos of Object.values(linhas)) for (const s of sentidos) for (const p of s.paradas) p.nome = nos.get(`${p.lat},${p.lon}`) || "";
  }
}

// Rotas reconstruídas à mão (linhas que o OpenStreetMap ainda não tem completas): ferramentas/rotas/<linha>.json.
for (const arq of await readdir(new URL("./rotas/", import.meta.url)).catch(() => [])) {
  if (!arq.endsWith(".json")) continue;
  const extra = JSON.parse(await readFile(new URL("./rotas/" + arq, import.meta.url), "utf8"));
  linhas[arq.replace(/\.json$/, "")] = extra.sentidos;
}

const dados = { fonte: "OpenStreetMap (© colaboradores do OpenStreetMap, ODbL)", atualizadoEm: new Date().toISOString(), linhas };
await writeFile(SAIDA, JSON.stringify(dados) + "\n");
console.log(`assets/dados/circulares.json: ${Object.keys(linhas).length} linhas, ${Object.values(linhas).flat().reduce((s, x) => s + x.paradas.length, 0)} paradas.`);
