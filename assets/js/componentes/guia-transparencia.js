// Transparência (transparencia/): saldo ao vivo, barra da dívida, gráfico mês a mês e extrato
// com o saldo acumulado. Os lançamentos vêm de dados/contas.js (banco Supabase ou arquivo).
// Uso: marcação em transparencia/index.html e <div data-componente="guia-transparencia"></div>.

import { carregar, ouvir, extrato, reais, dataBR, INICIO_CONTAS } from "../dados/contas.js?v=202610141209";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function guiaTransparencia(_alvo, { site, raiz }) {
  if (!$("#tabelaContas")) return;
  const F = { tipo: "todos", categoria: "", busca: "" };
  let dados = null, idsVistos = new Set(), primeira = true;

  async function atualizar() {
    try {
      const r = await carregar(site, raiz);
      dados = { ...r, ...extrato(r.lancamentos, r.parametros) };
      desenhar();
      const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const vivo = $("#aoVivo");
      vivo.classList.toggle("on", r.modo === "banco");
      vivo.querySelector("span").textContent = r.modo === "banco" ? `Ao vivo · atualizado às ${hora}`
        : dados.linhas.length ? `Contas publicadas · conferido às ${hora}` : "As contas começam a ser publicadas em 1º de janeiro de 2027.";
    } catch {
      $("#aoVivo span").textContent = "Não deu para carregar as contas agora. Tente de novo em alguns minutos.";
    }
  }

  function desenhar() {
    const d = dados;
    // saldo
    const sv = $("#saldoValor");
    sv.textContent = reais(d.saldo);
    sv.classList.toggle("negativo", d.saldo < 0);
    $("#saldoRotulo").textContent = d.inicialDefinido ? `Saldo desde 1º de janeiro de 2027 (começou com ${reais(d.inicial)})` : "Saldo desde 1º de janeiro de 2027";
    $("#totReceitas").textContent = reais(d.receitas);
    $("#totDespesas").textContent = reais(d.despesas);
    $("#totLanc").textContent = d.linhas.length;

    // dívida
    const barra = $("#dividaBarra"), pago = $("#dividaPago");
    if (d.divida.total == null) {
      barra.classList.add("a-confirmar");
      pago.style.width = "0";
      $("#dividaValor").textContent = "Valor a confirmar";
      $("#dividaLegenda").textContent = d.divida.paga
        ? `Já foram pagos ${reais(d.divida.paga)}. O valor total está sendo levantado e será publicado aqui.`
        : "O valor total está sendo levantado e será publicado aqui. Cada pagamento lançado pelo Grêmio vai encher esta barra.";
      barra.setAttribute("aria-label", "Valor da dívida ainda a confirmar");
    } else {
      barra.classList.remove("a-confirmar");
      const pct = d.divida.total > 0 ? Math.min(100, (d.divida.paga / d.divida.total) * 100) : 100;
      pago.style.width = `${pct}%`;
      const resta = Math.max(0, d.divida.total - d.divida.paga);
      $("#dividaValor").textContent = resta ? `Faltam ${reais(resta)}` : "Dívida quitada";
      $("#dividaLegenda").textContent = `${reais(d.divida.paga)} pagos de ${reais(d.divida.total)} (${pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%). A barra enche a cada pagamento lançado.`;
      barra.setAttribute("aria-label", `${pct.toFixed(0)}% da dívida paga`);
    }

    grafico();
    graficoAcumulado();

    // categorias do filtro
    const sel = $("#fCategoria"), atual = sel.value;
    const cats = [...new Set(d.linhas.map((l) => l.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt"));
    sel.innerHTML = `<option value="">Todas as categorias</option>` + cats.map((c) => `<option${c === atual ? " selected" : ""}>${esc(c)}</option>`).join("");
    tabela();
    primeira = false;
  }

  function grafico() {
    const svg = $("#grafMeses");
    const w = Math.max(320, svg.clientWidth || 800), h = 240, esq = 8, dir = 8, topo = 14, baixo = 26;
    const porMes = MESES.map(() => ({ r: 0, d: 0, saldo: null }));
    for (const l of dados.linhas) {
      const m = +l.data.slice(5, 7) - 1;
      if (l.data.slice(0, 4) !== INICIO_CONTAS.slice(0, 4)) continue;
      if (l.tipo === "receita") porMes[m].r += l.valor; else porMes[m].d += l.valor;
      porMes[m].saldo = l.saldo;
    }
    let ultimo = dados.inicial;
    const hojeMes = new Date().getFullYear() === 2027 ? new Date().getMonth() : (new Date().getFullYear() > 2027 ? 11 : -1);
    porMes.forEach((p, i) => { if (p.saldo == null) p.saldo = i <= hojeMes ? ultimo : null; else ultimo = p.saldo; });
    const valores = porMes.flatMap((p) => [p.r, -p.d, p.saldo ?? 0]);
    const max = Math.max(1, ...valores), min = Math.min(0, ...valores);
    const y = (v) => topo + ((max - v) / (max - min)) * (h - topo - baixo);
    const col = (w - esq - dir) / 12, bw = Math.max(6, col * 0.28);
    let s = `<line class="zero" x1="${esq}" x2="${w - dir}" y1="${y(0)}" y2="${y(0)}"/>`;
    porMes.forEach((p, i) => {
      const cx = esq + col * i + col / 2;
      if (p.r) s += `<rect class="barra-r" x="${cx - bw - 1}" y="${y(p.r)}" width="${bw}" height="${y(0) - y(p.r)}" rx="2"><title>${MESES[i]}: receitas ${reais(p.r)}</title></rect>`;
      if (p.d) s += `<rect class="barra-d" x="${cx + 1}" y="${y(0)}" width="${bw}" height="${y(-p.d) - y(0)}" rx="2"><title>${MESES[i]}: despesas ${reais(p.d)}</title></rect>`;
      s += `<text class="rot" x="${cx}" y="${h - 8}" text-anchor="middle">${MESES[i]}</text>`;
    });
    const pts = porMes.map((p, i) => (p.saldo == null ? null : [esq + col * i + col / 2, y(p.saldo), p.saldo, i])).filter(Boolean);
    if (pts.length) {
      s += `<polyline class="linha-saldo" points="${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ")}"/>`;
      s += pts.map((p) => `<circle class="ponto-saldo" cx="${p[0]}" cy="${p[1]}" r="4"><title>${MESES[p[3]]}: saldo ${reais(p[2])}</title></circle>`).join("");
    }
    if (!dados.linhas.length) s += `<text class="rot" x="${w / 2}" y="${h / 2 - 10}" text-anchor="middle">Os meses de 2027 vão se preencher conforme as contas forem lançadas.</text>`;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = s;
  }

  /* ---------- saldo acumulado x dívida, com ajuste de curva ---------- */
  // Mínimos quadrados lineares nos coeficientes: S(t) = Σ cᵢ·fᵢ(t), por equações normais e Gauss.
  function minimosQuadrados(xs, ys, bases) {
    const n = bases.length, A = Array.from({ length: n }, () => Array(n + 1).fill(0));
    xs.forEach((x, i) => {
      const p = bases.map((f) => f(x));
      for (let r = 0; r < n; r++) { for (let c = 0; c < n; c++) A[r][c] += p[r] * p[c]; A[r][n] += p[r] * ys[i]; }
    });
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      [A[c], A[piv]] = [A[piv], A[c]];
      if (Math.abs(A[c][c]) < 1e-12) return null;
      for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
    }
    return A.map((linha, i) => linha[n] / linha[i]);
  }
  const num = (v) => Math.abs(v).toLocaleString("pt-BR", { maximumFractionDigits: Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 1 ? 2 : 3 });
  const sinal = (v, primeiro) => (primeiro ? (v < 0 ? "−" : "") : v < 0 ? " − " : " + ");
  const SOB = ["", "", "²", "³"];

  // Famílias candidatas. Cada uma devolve { nome, k (parâmetros), f(t), formula } ou null.
  const familias = [
    ...[1, 2, 3].map((g) => (xs, ys) => {
      const c = minimosQuadrados(xs, ys, Array.from({ length: g + 1 }, (_, k) => (t) => t ** k)); if (!c) return null;
      const termos = c.map((a, k) => ({ a, k })).filter(({ a }) => Math.abs(a) > 1e-9);
      return { nome: g === 1 ? "reta" : `polinômio de grau ${g}`, k: g + 1, f: (t) => c.reduce((s, a, k) => s + a * t ** k, 0),
        formula: "S(t) ≈ " + termos.map(({ a, k }, i) => `${sinal(a, !i)}${num(a)}${k ? "·t" + SOB[k] : ""}`).join("") };
    }),
    (xs, ys) => { // logarítmica: cresce rápido no começo e desacelera
      const c = minimosQuadrados(xs, ys, [() => 1, (t) => Math.log(t)]); if (!c) return null;
      return { nome: "logarítmica", k: 2, f: (t) => c[0] + c[1] * Math.log(t), formula: `S(t) ≈ ${sinal(c[0], true)}${num(c[0])}${sinal(c[1])}${num(c[1])}·ln t` };
    },
    (xs, ys) => { // exponencial: S = a + b·e^(c·t); busca c numa grade e resolve a, b por mínimos quadrados
      let melhor = null;
      for (let i = -200; i <= 200; i++) {
        const cc = Math.sign(i) * 0.005 * Math.abs(i) ** 1.2; if (Math.abs(cc) < 1e-4) continue;
        const c = minimosQuadrados(xs, ys, [() => 1, (t) => Math.exp(cc * t)]); if (!c) continue;
        const rss = xs.reduce((s, x, j) => s + (ys[j] - c[0] - c[1] * Math.exp(cc * x)) ** 2, 0);
        if (!melhor || rss < melhor.rss) melhor = { rss, a: c[0], b: c[1], cc };
      }
      if (!melhor) return null;
      const { a, b, cc } = melhor;
      return { nome: "exponencial", k: 3, f: (t) => a + b * Math.exp(cc * t),
        formula: `S(t) ≈ ${sinal(a, true)}${num(a)}${sinal(b)}${num(b)}·e<sup>${cc < 0 ? "−" : ""}${num(cc)}·t</sup>` };
    },
  ];

  // Escolhe a família pelo critério AICc (pune parâmetros a mais com poucos pontos).
  // Se uma família mais simples ficar a menos de 2 pontos da melhor, fica a mais simples.
  function melhorAjuste(xs, ys) {
    const n = xs.length, media = ys.reduce((a, b) => a + b, 0) / n;
    const tss = ys.reduce((s, y) => s + (y - media) ** 2, 0);
    const candidatos = [];
    for (const fam of familias) {
      const m = fam(xs, ys); if (!m) continue;
      const k = m.k + 1; if (n - k - 1 <= 0) continue;
      const rss = xs.reduce((s, x, i) => s + (ys[i] - m.f(x)) ** 2, 0);
      if (!isFinite(rss)) continue;
      candidatos.push({ ...m, aicc: n * Math.log(Math.max(rss, 1e-9) / n) + 2 * k + (2 * k * (k + 1)) / (n - k - 1), r2: tss > 0 ? 1 - rss / tss : 1 });
    }
    if (!candidatos.length) return null;
    const minimo = Math.min(...candidatos.map((c) => c.aicc));
    return candidatos.filter((c) => c.aicc <= minimo + 2).sort((a, b) => a.k - b.k || a.aicc - b.aicc)[0];
  }

  // Data de referência (permite conferir o gráfico em outra data com ?hoje=AAAA-MM-DD).
  const hojeRef = () => { const q = new URLSearchParams(location.search).get("hoje"); return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? new Date(q + "T12:00:00") : new Date(); };

  function graficoAcumulado() {
    const svg = $("#grafAcum");
    const w = Math.max(320, svg.clientWidth || 800), h = 280, esq = 8, dir = 8, topo = 16, baixo = 26;
    const ano = INICIO_CONTAS.slice(0, 4);
    // Só meses já encerrados: a barra e o recálculo da curva entram quando o mês termina.
    const ref = hojeRef();
    const M = ref.getFullYear() == ano ? ref.getMonth() : ref.getFullYear() > ano ? 12 : 0;
    const pontos = [];
    let saldo = dados.inicial;
    for (let m = 1; m <= M; m++) {
      for (const l of dados.linhas) if (+l.data.slice(5, 7) === m && l.data.slice(0, 4) === ano) saldo = l.saldo;
      pontos.push([m, saldo]);
    }
    const ajuste = pontos.length >= 3 ? melhorAjuste(pontos.map((p) => p[0]), pontos.map((p) => p[1])) : null;
    const D = dados.divida.total;
    const curva = ajuste ? Array.from({ length: 111 }, (_, i) => { const t = 1 + i * 0.1; return [t, ajuste.f(t)]; }) : [];
    const vals = [0, ...pontos.map((p) => p[1]), ...(D != null ? [D] : []), ...curva.map((p) => p[1])];
    const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
    const col = (w - esq - dir) / 12, bw = Math.max(8, col * 0.5);
    const x = (t) => esq + col * (t - 1) + col / 2;
    const y = (v) => topo + ((max - v) / (max - min || 1)) * (h - topo - baixo);
    let s = `<line class="zero" x1="${esq}" x2="${w - dir}" y1="${y(0)}" y2="${y(0)}"/>`;
    MESES.forEach((m, i) => { s += `<text class="rot" x="${x(i + 1)}" y="${h - 8}" text-anchor="middle">${m}</text>`; });
    for (const [t, v] of pontos) s += `<rect class="barra-s${v < 0 ? " neg" : ""}" x="${x(t) - bw / 2}" y="${Math.min(y(v), y(0))}" width="${bw}" height="${Math.abs(y(0) - y(v))}" rx="3"><title>${MESES[t - 1]}: saldo ${reais(v)}</title></rect>`;
    if (D != null) s += `<line class="linha-divida" x1="${esq}" x2="${w - dir}" y1="${y(D)}" y2="${y(D)}"/><text class="rot-divida" x="${w - dir - 4}" y="${y(D) - 6}" text-anchor="end">dívida: ${reais(D)}</text>`;
    else s += `<text class="rot-divida" x="${w - dir - 4}" y="${topo + 12}" text-anchor="end">dívida: valor a confirmar</text>`;
    if (curva.length) s += `<polyline class="curva-ajuste" points="${curva.map(([t, v]) => `${x(t).toFixed(1)},${y(Math.max(min, Math.min(max, v))).toFixed(1)}`).join(" ")}"/>`;
    if (!pontos.length) s += `<text class="rot" x="${w / 2}" y="${h / 2}" text-anchor="middle">A primeira barra entra quando janeiro de 2027 terminar.</text>`;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = s;

    // canto do ajuste
    const caixa = $("#ajuste");
    if (!ajuste) {
      caixa.innerHTML = `<span class="ajuste__titulo">ajuste de curva</span><span class="ajuste__formula">S(t) = ?</span><small>Aparece com 3 meses encerrados.</small>`;
      caixa.title = "";
      $("#ajustePrevisao").hidden = true;
      return;
    }
    let previsao = "";
    if (D != null && pontos[pontos.length - 1][1] < D) {
      let tCruz = null;
      for (let t = M; t <= M + 36; t += 0.05) if (ajuste.f(t) >= D) { tCruz = t; break; }
      if (tCruz) { const mes = Math.ceil(tCruz), mm = ((mes - 1) % 12), aa = +ano + Math.floor((mes - 1) / 12); previsao = `Extrapolando (com toda a cautela de engenheiro), o saldo alcançaria a dívida por volta de ${MESES[mm]}/${aa}.`; }
      else previsao = "No ritmo do ajuste, o saldo não alcança a dívida nos próximos três anos.";
    }
    caixa.innerHTML = `<span class="ajuste__titulo">mínimos quadrados</span>
      <span class="ajuste__formula">${ajuste.formula}</span>
      <small>${ajuste.nome} (AICc) · R² = ${ajuste.r2.toLocaleString("pt-BR", { maximumFractionDigits: 3 })} · t em meses</small>`;
    caixa.title = `Melhor entre reta, polinômios de grau 2 e 3, logarítmica e exponencial, pelo critério AICc. Recalculado a cada mês encerrado. t = meses desde dez/${+ano - 1}; S em reais.`;
    const prev = $("#ajustePrevisao");
    prev.hidden = !previsao;
    prev.textContent = previsao;
  }

  function tabela() {
    const q = norm(F.busca);
    const linhas = dados.linhas.filter((l) => (F.tipo === "todos" || l.tipo === F.tipo) && (!F.categoria || l.categoria === F.categoria) && (!q || norm(`${l.descricao} ${l.categoria} ${l.diretoria || ""}`).includes(q)));
    const caixa = $("#tabelaContas");
    if (!dados.linhas.length) {
      caixa.innerHTML = `<div class="contas-vazio"><b>Nenhuma conta lançada ainda</b>As receitas e despesas de 2027 aparecem aqui assim que a gestão registrar no portal interno, com o saldo atualizado na hora.</div>`;
      return;
    }
    if (!linhas.length) { caixa.innerHTML = `<div class="contas-vazio"><b>Nada com esses filtros</b>Tente outra categoria ou limpe a busca.</div>`; return; }
    caixa.innerHTML = `<table><thead><tr><th>Data</th><th>Descrição</th><th class="num">Valor</th><th class="num">Saldo depois</th></tr></thead><tbody>${linhas.slice().reverse().map((l) => {
      const novo = !primeira && l.id && !idsVistos.has(l.id);
      return `<tr${novo ? ' class="novo"' : ""}>
        <td class="c-data tab">${dataBR(l.data)}</td>
        <td>${esc(l.descricao)}<br><span class="cat${l.abate_divida ? " cat--divida" : ""}">${esc(l.abate_divida ? "Pagamento da dívida" : l.categoria)}</span>${l.diretoria ? ` <span class="cat">${esc(l.diretoria)}</span>` : ""}${l.comprovante_url ? ` <a class="cat" href="${esc(l.comprovante_url)}" target="_blank" rel="noopener">Comprovante</a>` : ""}</td>
        <td class="num ${l.tipo === "receita" ? "valor-r" : "valor-d"}">${l.tipo === "receita" ? "+" : "−"} ${reais(l.valor)}</td>
        <td class="num c-saldo">${reais(l.saldo)}</td>
      </tr>`;
    }).join("")}</tbody></table>`;
    idsVistos = new Set(dados.linhas.map((l) => l.id));
  }

  // filtros
  $("#fTipo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tipo]"); if (!b) return;
    F.tipo = b.dataset.tipo;
    $("#fTipo").querySelectorAll("[data-tipo]").forEach((x) => x.setAttribute("aria-pressed", x === b));
    tabela();
  });
  $("#fCategoria").addEventListener("change", (e) => { F.categoria = e.target.value; tabela(); });
  $("#fBusca").addEventListener("input", (e) => { F.busca = e.target.value; tabela(); });

  // planilha
  $("#baixarCsv").addEventListener("click", () => {
    if (!dados) return;
    const c = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = [["data", "tipo", "descricao", "categoria", "diretoria", "valor", "saldo_depois", "pagamento_da_divida"].join(";"),
      ...dados.linhas.map((l) => [l.data, l.tipo, c(l.descricao), c(l.categoria), c(l.diretoria), l.valor.toFixed(2).replace(".", ","), l.saldo.toFixed(2).replace(".", ","), l.abate_divida ? "sim" : "não"].join(";"))];
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "contas-gremio-politecnico-2027.csv" });
    document.body.appendChild(a); a.click(); a.remove();
  });

  new ResizeObserver(() => { if (dados) { grafico(); graficoAcumulado(); } }).observe($("#grafMeses"));
  await atualizar();
  // Ao vivo: o banco avisa a cada mudança; a cada minuto, confere de novo por garantia.
  ouvir(site, () => atualizar());
  setInterval(atualizar, 60_000);
}
