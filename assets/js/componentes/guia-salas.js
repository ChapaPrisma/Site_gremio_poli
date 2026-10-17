// Salas (aluno/salas/): pulso do campus, mapa de salas livres, busca de aulas, montador de grade e "Minha grade".
// Uso: a marcação fica em aluno/salas/index.html e <div data-componente="guia-salas"></div>.
// Dados: assets/dados/salas.json, gerado por ferramentas/salas.mjs a partir do USPolis.
//   salas      [id, prédio, nome, capacidade, andar, bandeiras(1 acessível, 2 ar, 4 audiovisual, 8 reservável)]
//   ocupacoes  [sala, data, início, fim, tipo(0 aula, 1 prova, 2 reunião, 3 evento), rótulo]
//   turmas     [disciplina, turma, [[dia da semana (0 = seg), início, fim, sala|null]], professores]
// Turmas de todas as disciplinas (horários, vagas): assets/dados/turmas.json, de ferramentas/turmas.mjs (JupiterWeb).
// A grade do aluno fica só no navegador dele (localStorage), sem ir a lugar nenhum; o botão "Compartilhar"
// põe a grade no próprio link (?grade=SIGLA~TURMA.SIGLA~TURMA), sem passar por servidor.

import { hora, agoraSP, hojeSP } from "../dados/tempo.js?v=202610171410";
import { CORES, carregarJsPdf, desenharPdf, gerarIcs, baixar } from "./grade-exportar.js?v=202610171410";
import { carregarIndice, textoCreditos, detalhes, ligarFichas } from "./ficha-disciplina.js?v=202610171410";
import { opcoesDe, combinar, incompativeis, notas, ORDENS } from "./montador-grade.js?v=202610171410";
import { cursos as cursosDoGuia } from "../dados/cursos.js?v=202610171410";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const INICIO = 7 * 60, FIM = 23 * 60;
const SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DIA_JS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const TIPOS = ["Aula", "Prova", "Reunião", "Evento"];
const CAPACIDADES = [[0, "Qualquer"], [20, "20+"], [40, "40+"], [80, "80+"]];
const CHAVE_GRADE = "gremio:minha-grade";

const lerGrade = () => { try { return JSON.parse(localStorage.getItem(CHAVE_GRADE)) || []; } catch { return []; } };
const salvarGrade = (g) => { try { localStorage.setItem(CHAVE_GRADE, JSON.stringify(g)); } catch {} };

export default async function guiaSalas(_alvo, { raiz }) {
  const mapa = $("#mapaSalas");
  if (!mapa) return;

  // Cache de 1 hora também no navegador: quem volta à página dentro de uma hora usa a cópia guardada.
  // (Os dados já chegam aqui no máximo uma vez por hora do USPolis; ver ferramentas/salas.mjs.)
  const CHAVE = "salas:cache", UMA_HORA = 60 * 60_000;
  let D;
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (guardado && Date.now() - guardado.em < UMA_HORA) D = guardado.dados;
  } catch {}
  try {
    if (!D) {
      const r = await fetch(new URL("assets/dados/salas.json", raiz), { cache: "no-cache" });
      D = await r.json();
      try { localStorage.setItem(CHAVE, JSON.stringify({ em: Date.now(), dados: D })); } catch {}
    }
  } catch {
    $("#pulsoSub").textContent = "Não deu para carregar os dados do USPolis agora.";
    mapa.innerHTML = `<p class="mapa-salas__vazio">Não deu para carregar as salas agora. Tente de novo em alguns minutos.</p>`;
    return;
  }

  /* ---------- índices ---------- */
  const salas = D.salas.map(([id, p, nome, cap, andar, f]) => ({ id, predio: D.predios[p], p, nome, cap, andar, f }));
  const porId = new Map(salas.map((s) => [s.id, s]));
  const ocup = new Map(); // id -> data -> [[ini, fim, tipo, rotulo]]
  for (const [id, data, ini, fim, tipo, rot] of D.ocupacoes) {
    if (!ocup.has(id)) ocup.set(id, new Map());
    const m = ocup.get(id);
    if (!m.has(data)) m.set(data, []);
    m.get(data).push([ini, fim, tipo, rot]);
  }
  const doDia = (id, data) => ocup.get(id)?.get(data) || [];

  const rotulo = ([, , tipo, rot]) => {
    if (tipo === 0 && rot) { const [c, t] = rot.split("|"); return { curto: c, longo: `${c} ${D.disciplinas[c] || ""}`.trim() + (t ? ` (turma ${t})` : "") }; }
    if (tipo === 1) return { curto: "Prova", longo: rot ? `Prova de ${rot} ${D.disciplinas[rot] || ""}`.trim() : "Prova" };
    return { curto: TIPOS[tipo], longo: TIPOS[tipo] };
  };

  // Estado de uma sala num dia e minuto: ocupada até quando, ou livre até quando.
  function estado(id, data, t) {
    const lista = doDia(id, data);
    const atual = lista.find((o) => o[0] <= t && t < o[1]);
    if (atual) {
      let ate = atual[1];
      for (const o of lista) if (o[0] <= ate && o[1] > ate) ate = o[1]; // ocupações encadeadas
      return { livre: false, ate, oc: atual, texto: `${rotulo(atual).curto} até ${hora(ate)}` };
    }
    const prox = lista.find((o) => o[0] > t);
    if (!prox) return { livre: true, curta: false, ate: null, texto: "livre o resto do dia" };
    const curta = prox[0] - t < 60;
    return { livre: true, curta, ate: prox[0], texto: curta ? `livre por ${prox[0] - t} min` : `livre até ${hora(prox[0])}` };
  }

  /* ---------- dias disponíveis ---------- */
  const hoje = hojeSP();
  const dias = [];
  for (let i = 0; i < 14 && dias.length < 7; i++) {
    const d = hojeSP(i);
    if (d >= D.janela.inicio && d <= D.janela.fim) dias.push(d);
  }
  const semDados = !dias.length;
  if (semDados) for (let i = 0; i < 7; i++) dias.push(hojeSP(i));
  const diaSemana = (data) => new Date(data + "T12:00:00").getDay();
  const nomeDia = (data, i) => {
    if (data === hoje) return "Hoje";
    if (data === hojeSP(1)) return "Amanhã";
    const [, m, d] = data.split("-");
    return `${DIA_JS[diaSemana(data)]} ${+d}/${+m}`;
  };

  /* ---------- estado da tela ---------- */
  const agoraMin = () => Math.min(FIM, Math.max(INICIO, Math.round(agoraSP().minuto / 10) * 10));
  const S = { dia: dias.includes(hoje) ? hoje : dias[0], min: agoraMin(), predio: "todos", cap: 0, acess: false, ar: false, reserva: false, soLivres: false, seguindo: true };

  const filtradas = () => salas.filter((s) =>
    (S.predio === "todos" || s.p === S.predio) && (!S.cap || s.cap >= S.cap) && (!S.acess || s.f & 1) && (!S.ar || s.f & 2) && (!S.reserva || s.f & 8));

  /* ---------- controles ---------- */
  const elDias = $("#dias"), elHora = $("#hora"), elSaida = $("#horaSaida");
  elDias.innerHTML = dias.map((d, i) => `<button type="button" class="chip" data-dia="${d}">${nomeDia(d, i)}</button>`).join("");
  const contagem = D.predios.map((_, i) => salas.filter((s) => s.p === i).length);
  $("#predios").innerHTML = `<button type="button" class="chip" data-predio="todos">Todos</button>` +
    D.predios.map((p, i) => contagem[i] ? `<button type="button" class="chip" data-predio="${i}">${esc(p)}</button>` : "").join("");
  $("#capacidades").innerHTML = CAPACIDADES.map(([v, r]) => `<button type="button" class="chip" data-cap="${v}">${r}</button>`).join("");

  const marcar = () => {
    elDias.querySelectorAll("[data-dia]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.dia === S.dia));
    $("#predios").querySelectorAll("[data-predio]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.predio === String(S.predio)));
    $("#capacidades").querySelectorAll("[data-cap]").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.cap === S.cap));
    $("#fAcess").setAttribute("aria-pressed", S.acess); $("#fAr").setAttribute("aria-pressed", S.ar); $("#fReserva").setAttribute("aria-pressed", S.reserva); $("#fLivres").setAttribute("aria-pressed", S.soLivres);
    elHora.value = S.min; elSaida.textContent = hora(S.min);
  };
  elDias.addEventListener("click", (e) => { const b = e.target.closest("[data-dia]"); if (!b) return; S.dia = b.dataset.dia; S.seguindo = false; tudo(); });
  $("#predios").addEventListener("click", (e) => { const b = e.target.closest("[data-predio]"); if (!b) return; S.predio = b.dataset.predio === "todos" ? "todos" : +b.dataset.predio; tudo(); });
  $("#capacidades").addEventListener("click", (e) => { const b = e.target.closest("[data-cap]"); if (!b) return; S.cap = +b.dataset.cap; tudo(); });
  $("#fAcess").onclick = () => { S.acess = !S.acess; tudo(); };
  $("#fAr").onclick = () => { S.ar = !S.ar; tudo(); };
  $("#fReserva").onclick = () => { S.reserva = !S.reserva; tudo(); };
  $("#fLivres").onclick = () => { S.soLivres = !S.soLivres; tudo(); };
  elHora.addEventListener("input", () => { S.min = +elHora.value; S.seguindo = false; tudo(); });
  $("#agora").onclick = () => { S.dia = dias.includes(hoje) ? hoje : dias[0]; S.min = agoraMin(); S.seguindo = true; tudo(); };

  /* ---------- mapa de salas ---------- */
  function desenharMapa() {
    const lista = filtradas();
    const aviso = $("#avisoDia");
    const ds = diaSemana(S.dia);
    if (semDados) { aviso.hidden = false; aviso.textContent = "Os dados do USPolis estão desatualizados. As salas podem não refletir o dia de hoje."; }
    else if (ds === 0 || ds === 6) { aviso.hidden = false; aviso.textContent = "Fim de semana: quase não há aulas, mas os prédios podem estar fechados ou com acesso restrito."; }
    else aviso.hidden = true;

    // Cobertura: quanto o USPolis registra neste dia (ele depende de as pessoas registrarem as atividades).
    const doDiaTodo = D.ocupacoes.filter((o) => o[1] === S.dia);
    const salasUsadas = new Set(doDiaTodo.map((o) => o[0])).size;
    $("#cobertura").textContent = `Neste dia o USPolis registra ${doDiaTodo.length} aulas, provas, reuniões e eventos em ${salasUsadas} das ${salas.length} salas. Como o USPolis depende de input humano, ele pode ter imprecisões: uma sala verde não tem nada registrado, mas pode estar em uso.`;

    if (!lista.length) { mapa.innerHTML = `<p class="mapa-salas__vazio">Nenhuma sala com esses filtros. Tente outro tamanho de grupo ou outro prédio.</p>`; return; }
    const grupos = new Map();
    for (const s of lista) { if (!grupos.has(s.p)) grupos.set(s.p, []); grupos.get(s.p).push(s); }
    let html = "";
    for (const [p, ss] of grupos) {
      const estados = ss.map((s) => [s, estado(s.id, S.dia, S.min)]);
      const livres = estados.filter(([, e]) => e.livre).length;
      const visiveis = estados.filter(([, e]) => !S.soLivres || e.livre);
      if (!visiveis.length) continue;
      html += `<section class="predio" aria-label="${esc(D.predios[p])}">
        <div class="predio__topo"><h3>${esc(D.predios[p])}</h3><span class="predio__conta"><b>${livres}</b> de ${ss.length} livres</span></div>
        <div class="predio__barra" aria-hidden="true"><i style="width:${(livres / ss.length) * 100}%"></i></div>
        <div class="salas-quadro">${visiveis.map(([s, e]) => `<button type="button" class="sala ${e.livre ? (e.curta ? "sala--curta" : "sala--livre") : "sala--ocupada"}" data-sala="${s.id}"
            aria-label="${esc(s.nome)}, ${esc(D.predios[p])}: ${esc(e.texto)}">
            <span class="sala__nome">${esc(s.nome)}${s.cap ? `<small class="sala__cap" title="${s.cap} lugares">${s.cap}</small>` : ""}</span>
            <span class="sala__info">${esc(e.texto)}</span>
          </button>`).join("")}</div>
      </section>`;
    }
    mapa.innerHTML = html || `<p class="mapa-salas__vazio">Nenhuma sala livre com esses filtros neste horário.</p>`;
  }
  mapa.addEventListener("click", (e) => { const b = e.target.closest("[data-sala]"); if (b) abrirSala(+b.dataset.sala); });

  /* ---------- pulso e curva ---------- */
  // O número grande mostra "agora" enquanto a tela segue o relógio; quando o aluno escolhe um dia ou um
  // horário (na curva, no controle ou nos dias), ele passa a mostrar as salas livres naquele momento.
  function desenharPulso() {
    const total = salas.length;
    $("#pulsoAgora").hidden = S.seguindo;
    if (!S.seguindo && !semDados) {
      const livres = filtradas().filter((s) => estado(s.id, S.dia, S.min).livre).length;
      const quando = S.dia === hoje ? `às ${hora(S.min)}` : `${nomeDia(S.dia).toLowerCase() === "amanhã" ? "amanhã" : nomeDia(S.dia)}, às ${hora(S.min)}`;
      $("#pulsoNum").textContent = livres;
      $("#pulsoTxt").textContent = `${livres === 1 ? "sala livre" : "salas livres"} ${quando}, segundo o USPolis`;
      $("#pulsoSub").textContent = `de ${filtradas().length} salas${filtradas().length < total ? " com os filtros escolhidos" : ` em ${D.predios.length} prédios da Poli`}.`;
      return;
    }
    if (semDados || !dias.includes(hoje)) {
      $("#pulsoNum").textContent = "–";
      $("#pulsoSub").textContent = "Dados do USPolis desatualizados no momento.";
      return;
    }
    const m = agoraSP().minuto;
    const livres = salas.filter((s) => estado(s.id, hoje, m).livre).length;
    $("#pulsoNum").textContent = livres;
    $("#pulsoTxt").textContent = livres === 1 ? "sala livre agora, segundo o USPolis" : "salas livres agora, segundo o USPolis";
    const fora = m < INICIO || m >= FIM ? " Fora do horário de aulas." : "";
    $("#pulsoSub").textContent = `de ${total} salas em ${D.predios.length} prédios da Poli, às ${hora(m)}.${fora}`;
  }

  const svg = $("#curva");
  function desenharCurva() {
    const w = Math.max(280, svg.clientWidth || 600), h = 120, base = h - 22, topo = 8;
    const lista = filtradas();
    const total = Math.max(1, lista.length);
    const pontos = [];
    for (let t = INICIO; t <= FIM; t += 10) pontos.push([t, lista.filter((s) => estado(s.id, S.dia, t).livre).length]);
    const x = (t) => ((t - INICIO) / (FIM - INICIO)) * w;
    // Escala vertical aproximada do intervalo real do dia, para a variação aparecer.
    const minN = Math.min(...pontos.map((p) => p[1])), maxN = lista.length;
    const piso = Math.max(0, minN - Math.max(2, Math.round((maxN - minN) * 0.25)));
    const y = (n) => base - ((n - piso) / Math.max(1, maxN - piso)) * (base - topo);
    let d = `M0 ${base}`; // a área desce até o piso da escala
    for (const [t, n] of pontos) d += `L${x(t).toFixed(1)} ${y(n).toFixed(1)}`;
    d += `L${w} ${base}Z`;
    let grade = "";
    for (let t = INICIO; t <= FIM; t += 120) grade += `<line class="grade-linha" x1="${x(t)}" x2="${x(t)}" y1="${topo}" y2="${base}"/><text class="rotulo" x="${Math.min(w - 18, Math.max(2, x(t) - 8))}" y="${h - 6}">${hora(t)}</text>`;
    const atual = pontos.find(([t]) => t === S.min) || pontos[0];
    let agora = "";
    if (S.dia === hoje) { const m = agoraSP().minuto; if (m >= INICIO && m <= FIM) agora = `<line class="marca-agora" x1="${x(m)}" x2="${x(m)}" y1="${topo}" y2="${base}"/>`; }
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const escala = `<text class="rotulo" x="${w - 4}" y="${topo + 10}" text-anchor="end">${maxN}</text><text class="rotulo" x="${w - 4}" y="${base - 4}" text-anchor="end">${piso}</text>`;
    // a alça: a linha do horário, um puxador redondo e, colado nele, quantas salas estão livres
    const ax = x(S.min), ay = y(atual[1]);
    // seguindo o relógio, a alça mostra o mesmo número do pulso (minuto exato, não o ponto de 10 em 10 min)
    const n = S.seguindo && S.dia === hoje ? lista.filter((s) => estado(s.id, hoje, agoraSP().minuto).livre).length : atual[1];
    const rotulo = `${n} livres`, larg = rotulo.length * 6.6 + 14;
    const rx = Math.min(w - larg - 2, Math.max(2, ax - larg / 2)), ry = ay - 34 < 0 ? ay + 14 : ay - 34;
    svg.innerHTML = `${grade}${escala}<path class="area" d="${d}"/>${agora}
      <line class="marca" x1="${ax}" x2="${ax}" y1="${topo}" y2="${base}"/>
      <g class="alca"><circle class="alca__halo" cx="${ax}" cy="${ay}" r="15"/><circle class="marca-ponto" cx="${ax}" cy="${ay}" r="9"/>
        <line class="alca__risco" x1="${ax - 2.5}" x2="${ax - 2.5}" y1="${ay - 3.5}" y2="${ay + 3.5}"/><line class="alca__risco" x1="${ax + 2.5}" x2="${ax + 2.5}" y1="${ay - 3.5}" y2="${ay + 3.5}"/></g>
      <g class="alca__rotulo"><rect x="${rx}" y="${ry}" width="${larg}" height="20" rx="10"/><text x="${rx + larg / 2}" y="${ry + 14}" text-anchor="middle">${rotulo}</text></g>`;
    svg.setAttribute("aria-label", `Salas livres ao longo do dia. Às ${hora(S.min)}, ${atual[1]} de ${lista.length} salas livres.`);
  }
  const escolherNaCurva = (e) => {
    const r = svg.getBoundingClientRect();
    const t = INICIO + Math.round((((e.clientX - r.left) / r.width) * (FIM - INICIO)) / 10) * 10;
    S.min = Math.min(FIM, Math.max(INICIO, t)); S.seguindo = false; tudo();
  };
  let arrastando = false;
  svg.addEventListener("pointerdown", (e) => { arrastando = true; svg.classList.add("arrastando"); svg.setPointerCapture(e.pointerId); escolherNaCurva(e); });
  svg.addEventListener("pointermove", (e) => { if (arrastando) escolherNaCurva(e); });
  const soltar = () => { arrastando = false; svg.classList.remove("arrastando"); };
  svg.addEventListener("pointerup", soltar);
  svg.addEventListener("pointercancel", soltar);
  new ResizeObserver(() => desenharCurva()).observe(svg);

  /* ---------- detalhe da sala ---------- */
  const dlg = $("#salaDetalhe");
  $("#detFechar").onclick = () => dlg.close();
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  function abrirSala(id) {
    const s = porId.get(id); if (!s) return;
    const e = estado(id, S.dia, S.min);
    $("#detPredio").textContent = s.predio;
    $("#detTitulo").textContent = s.nome;
    const dados = [];
    if (s.cap) dados.push(`Até ${s.cap} pessoas`);
    if (s.andar != null) dados.push(s.andar === 0 ? "Térreo" : `${s.andar}º andar`);
    if (s.f & 1) dados.push("Acessível");
    if (s.f & 2) dados.push("Ar-condicionado");
    if (s.f & 4) dados.push("Audiovisual");
    if (s.f & 8) dados.push("Reservável no USPolis");
    $("#detDados").innerHTML = dados.map((x) => `<li>${esc(x)}</li>`).join("");
    const quando = `${nomeDia(S.dia).toLowerCase() === "hoje" ? "Hoje" : nomeDia(S.dia)}, às ${hora(S.min)}`;
    $("#detEstado").textContent = e.livre ? `${quando}: livre${e.ate ? ` até ${hora(e.ate)}` : " pelo resto do dia"}.` : `${quando}: ocupada (${rotulo(e.oc).longo}) até ${hora(e.ate)}.`;
    const lista = doDia(id, S.dia);
    const pos = (t) => (((Math.min(FIM, Math.max(INICIO, t)) - INICIO) / (FIM - INICIO)) * 100).toFixed(2);
    $("#detLinha").innerHTML = lista.map(([a, b, tipo]) => `<i class="t${tipo}" style="left:${pos(a)}%;width:${pos(b) - pos(a)}%"></i>`).join("") + `<b style="left:calc(${pos(S.min)}% - 1px)"></b>`;
    if (!$("#detLinha").nextElementSibling?.classList.contains("linha-dia__horas")) {
      $("#detLinha").insertAdjacentHTML("afterend", `<div class="linha-dia__horas" aria-hidden="true"><span>7h</span><span>11h</span><span>15h</span><span>19h</span><span>23h</span></div>`);
    }
    $("#detLista").innerHTML = lista.length
      ? lista.map((o) => `<li><b>${hora(o[0])}–${hora(o[1])}</b><span>${esc(rotulo(o).longo)}</span></li>`).join("")
      : `<li><b>Dia todo</b><span>Nenhuma ocupação registrada neste dia.</span></li>`;
    dlg.showModal();
  }

  /* ---------- turmas: USPolis (com sala) + JupiterWeb (todas, com vagas) ---------- */
  // Uma turma por "disciplina|código". O USPolis traz a sala de cada aula; o JupiterWeb traz todas as turmas
  // do semestre, as vinculadas (prática ligada a uma teórica), professores e vagas (ferramentas/turmas.mjs).
  const semR = (p) => String(p || "").replace(/^\(R\)\s*/, "").trim();
  const turmasU = new Map();   // disciplina -> Map(código -> turma)
  let J = null;
  function indexarTurmas() {
    turmasU.clear();
    const por = (c) => { if (!turmasU.has(c)) turmasU.set(c, new Map()); return turmasU.get(c); };
    for (const [c, t, hs, prof] of D.turmas) por(c).set(t, { c, t, tipo: 0, teorica: "", h: hs.map((x) => [...x]), prof: prof.map(semR), uspolis: true });
    for (const [c, t, tipo, teorica, hs, prof, total, grupos, obs] of J?.turmas || []) {
      const ja = por(c).get(t);
      if (ja) {
        Object.assign(ja, { tipo, teorica, vagas: total, grupos, obs });
        for (const p of prof) if (!ja.prof.includes(p)) ja.prof.push(p);
        for (const [wd, a, b] of hs) if (!ja.h.some((y) => y[0] === wd && y[1] < b && a < y[2])) ja.h.push([wd, a, b, null]);
      } else por(c).set(t, { c, t, tipo, teorica, h: hs.map(([wd, a, b]) => [wd, a, b, null]), prof: [...prof], vagas: total, grupos, obs });
    }
  }
  const turmasDe = (c) => [...(turmasU.get(c)?.values() || [])].sort((a, b) => a.t.localeCompare(b.t));
  const turmaDe = (c, t) => turmasU.get(c)?.get(t);
  const nomeDe = (c) => D.disciplinas[c] || J?.disciplinas?.[c] || fichas?.indice?.[c]?.[0] || "";
  let indiceBusca = [];
  const indexarBusca = () => { indiceBusca = [...turmasU.keys()].map((c) => ({ c, nc: norm(c), nn: norm(nomeDe(c)) })); };
  const achar = (texto, max) => {
    const q = norm(texto.trim()); if (q.length < 2) return null;
    const palavras = q.split(/\s+/);
    return indiceBusca.filter((d) => d.nc.startsWith(q) || palavras.every((p) => d.nn.includes(p) || d.nc.includes(p))).slice(0, max);
  };
  const lotada = (x) => x.vagas && x.vagas[0] > 0 && x.vagas[2] >= x.vagas[0];
  const textoVagas = (x) => (x.vagas && x.vagas[0] ? `${x.vagas[2]} matriculados de ${x.vagas[0]} vagas` : "");
  const textoTipo = (x) => (x.teorica ? `prática da turma ${x.teorica}` : x.tipo === 1 ? "prática" : "");

  /* ---------- a grade: a minha (salva neste navegador) ou uma compartilhada pelo link ---------- */
  let minha = lerGrade();
  const doLink = new URLSearchParams(location.search).get("grade");
  let compartilhada = doLink ? doLink.split(".").map((k) => k.replace("~", "|")).filter((k) => /^[A-Z0-9]{7}\|\w+$/.test(k)) : null;
  if (compartilhada && !compartilhada.length) compartilhada = null;
  let grade = compartilhada || minha;
  const guardar = () => { if (!compartilhada) { minha = grade; salvarGrade(grade); } };
  const naGrade = (c, t) => grade.includes(`${c}|${t}`);
  const alternar = (k) => { grade = grade.includes(k) ? grade.filter((x) => x !== k) : [...grade, k]; guardar(); depoisDaGrade(); };
  function sairDoLink(usar) {
    if (usar) { minha = grade; salvarGrade(grade); } else grade = minha;
    compartilhada = null;
    history.replaceState(null, "", location.pathname + "#grade");
    depoisDaGrade();
  }

  /* ---------- onde é a minha aula ---------- */
  const descreverHorario = ([wd, a, b, sala]) => {
    const s = sala != null ? porId.get(sala) : null;
    return { texto: `${SEMANA[wd] || "?"} ${hora(a)}–${hora(b)} · ${s ? `${s.predio} ${s.nome}` : "sala a definir"}`, semSala: !s };
  };
  const itemTurma = (x) => `<li class="turma">
      <div>
        <span class="turma__cod">Turma ${esc(x.t)}</span>${textoTipo(x) ? ` <span class="turma__tipo">${esc(textoTipo(x))}</span>` : ""}
        ${x.prof.length ? `<span class="turma__prof"> · ${esc(x.prof.join(", "))}</span>` : ""}
        <ul class="turma__horarios">${x.h.map((h) => { const d = descreverHorario(h); return `<li${d.semSala ? ' class="sem-sala"' : ""}>${esc(d.texto)}</li>`; }).join("")}</ul>
        ${textoVagas(x) ? `<span class="turma__vagas${lotada(x) ? " is-lotada" : ""}">${esc(textoVagas(x))}</span>` : ""}
      </div>
      <button type="button" class="chip" data-grade="${esc(x.c)}|${esc(x.t)}" aria-pressed="${naGrade(x.c, x.t)}">${naGrade(x.c, x.t) ? "Na sua grade" : "Adicionar à grade"}</button>
    </li>`;
  function buscar() {
    const est = $("#buscaEstado"), res = $("#resultados");
    const achadas = achar($("#busca").value, 12);
    if (!achadas) { est.textContent = `${turmasU.size} disciplinas com turma neste semestre${J ? "" : " (carregando as do JupiterWeb)"}.`; res.innerHTML = ""; return; }
    est.textContent = achadas.length ? (achadas.length === 12 ? "Mostrando as 12 primeiras. Refine a busca para ver outras." : `${achadas.length} disciplina${achadas.length > 1 ? "s" : ""} encontrada${achadas.length > 1 ? "s" : ""}.`) : "Nenhuma disciplina encontrada. Confira o código ou tente uma palavra do nome.";
    res.innerHTML = achadas.map((d) => { const j = fichas?.indice?.[d.c]; return `<article class="disciplina">
        <h3><span>${esc(d.c)}</span>${esc(nomeDe(d.c))}</h3>
        ${j ? `<p class="disciplina__creditos">${esc(textoCreditos(j[1], j[2]))}</p>${detalhes(d.c)}` : ""}
        <ul class="turmas">${turmasDe(d.c).map(itemTurma).join("")}</ul>
      </article>`; }).join("");
  }
  // Créditos e ementa de cada disciplina (JupiterWeb, ficha-disciplina.js) e as turmas do JupiterWeb chegam em
  // segundo plano; quando chegam, a busca, a grade, a conferência do 1º ano e o montador são redesenhados.
  const url = (p) => new URL(p, raiz).href;
  let fichas = null;
  indexarTurmas(); indexarBusca();
  carregarIndice(url).then((d) => { fichas = d; if (d) { indexarBusca(); buscar(); desenharGrade(); montarConferencia(); desenharMontador(); } });
  fetch(url("assets/dados/turmas.json"), { cache: "no-cache" }).then((r) => r.json()).then((d) => {
    J = d; indexarTurmas(); indexarBusca(); depoisDaGrade(); desenharMontador();
  }).catch(() => {});
  ligarFichas($("#resultados"), url);
  let espera;
  $("#busca").addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(buscar, 150); });
  for (const caixa of ["#resultados", "#conferencia"]) $(caixa).addEventListener("click", (e) => { const b = e.target.closest("[data-grade]"); if (b) alternar(b.dataset.grade); });

  /* ---------- quadro da semana (a grade e a prévia do montador) ---------- */
  const corDe = (codigos, c) => CORES[codigos.indexOf(c) % CORES.length];
  function blocosDe(chaves) {
    const codigos = [...new Set(chaves.map((k) => k.split("|")[0]))];
    const blocos = [], faltando = [];
    for (const k of chaves) {
      const [c, t] = k.split("|"), x = turmaDe(c, t);
      if (!x) { faltando.push(`${c} (turma ${t})`); continue; }
      for (const h of x.h) blocos.push({ c, t, cor: corDe(codigos, c), prof: x.prof, wd: h[0], a: h[1], b: h[2], sala: h[3] != null ? porId.get(h[3]) : null });
    }
    for (const x of blocos) x.conflito = blocos.some((y) => y !== x && y.wd === x.wd && y.c + y.t !== x.c + x.t && y.a < x.b && x.a < y.b);
    return { blocos, faltando, codigos };
  }
  function quadroSemana(blocos, { px = 44, mini = false } = {}) {
    const dias = blocos.some((x) => x.wd === 5) ? 6 : 5;
    const hIni = mini && blocos.length ? Math.min(...blocos.map((x) => Math.floor(x.a / 60))) : 7;
    const hFim = mini && blocos.length ? Math.max(...blocos.map((x) => Math.ceil(x.b / 60))) : 23;
    const ini = hIni * 60;
    let html = `<div class="grade__tabela${mini ? " grade__tabela--mini" : ""}" style="--dias:${dias};--altura:${(hFim - hIni) * px}px"><div class="grade__cab"></div>${SEMANA.slice(0, dias).map((d) => `<div class="grade__cab">${d}</div>`).join("")}`;
    html += `<div class="grade__horas">${Array.from({ length: hFim - hIni + 1 }, (_, i) => `<span style="top:${i * px}px">${hIni + i}h</span>`).join("")}</div>`;
    for (let wd = 0; wd < dias; wd++) {
      html += `<div class="grade__dia">${blocos.filter((x) => x.wd === wd).map((x) => {
        const top = ((Math.max(ini, x.a) - ini) / 60) * px, alt = Math.max(mini ? 18 : 28, ((Math.min(hFim * 60, x.b) - Math.max(ini, x.a)) / 60) * px - 2);
        return `<div class="bloco-aula${x.conflito ? " conflito" : ""}" style="top:${top}px;height:${alt}px;background:${x.cor}" title="${esc(`${x.c} ${nomeDe(x.c)}, turma ${x.t}, ${hora(x.a)}–${hora(x.b)}`)}">
          <b>${esc(x.c)}</b>${mini ? "" : `${hora(x.a)}–${hora(x.b)}<br>${x.sala ? esc(`${x.sala.predio} ${x.sala.nome}`) : "sala a definir"}`}</div>`;
      }).join("")}</div>`;
    }
    return html + `</div>`;
  }

  /* ---------- minha grade ---------- */
  let aulas = []; // a grade montada, para o PDF e a agenda
  function desenharGrade() {
    const quadro = $("#gradeQuadro");
    $("#gradeAcoes").hidden = $("#gradeAviso").hidden = !grade.length;
    $("#gradeImportar").hidden = true;
    $("#gradeCompartilhada").hidden = !compartilhada;
    $("#gradeLimpar").hidden = !!compartilhada;
    aulas = [];
    if (!grade.length) { quadro.innerHTML = `<p class="grade__vazia">Sua grade está vazia. Procure uma disciplina acima e toque em "Adicionar à grade", ou use o montador.</p>`; return; }
    const { blocos, faltando, codigos } = blocosDe(grade);
    const minutosSemana = blocos.reduce((s, x) => s + (x.b - x.a), 0);
    // créditos: os oficiais do JupiterWeb quando todas as disciplinas da grade têm ficha; senão, a estimativa pelas horas de aula
    const doJupiter = codigos.map((c) => fichas?.indice?.[c]?.[1]);
    const hs = Math.floor(minutosSemana / 60), mins = minutosSemana % 60, creditos = doJupiter.length && doJupiter.every((x) => x != null) ? doJupiter.reduce((a, b) => a + b, 0) : Math.round(minutosSemana / 50);
    const duracao = [hs ? `${hs} hora${hs === 1 ? "" : "s"}` : "", mins ? `${mins} minuto${mins === 1 ? "" : "s"}` : ""].filter(Boolean).join(" e ") || "0 minutos";
    const n = grade.length - faltando.length;
    const notasGrade = [`${n} turma${n === 1 ? "" : "s"}, ${duracao} de aula por semana, ${creditos} crédito${creditos === 1 ? "" : "s"}.`];
    if (blocos.some((x) => x.conflito)) notasGrade.push("Os blocos com contorno tracejado têm conflito de horário.");
    if (faltando.length) notasGrade.push(J ? `Não estão nas turmas deste semestre: ${faltando.join(", ")}.` : "Carregando as turmas do JupiterWeb…");
    const lista = grade.map((k) => {
      const [c, t] = k.split("|");
      return `<li><i style="background:${corDe(codigos, c)}"></i><span><b>${esc(c)}</b> ${esc(nomeDe(c))} <small>turma ${esc(t)}</small></span>
        <button type="button" class="chip" data-tirar="${esc(k)}" aria-label="Tirar ${esc(c)} da grade">Tirar da grade</button></li>`;
    }).join("");
    quadro.innerHTML = quadroSemana(blocos) + `<p class="grade__nota">${esc(notasGrade.join(" "))}</p><ul class="grade__turmas">${lista}</ul>`;
    aulas = blocos.filter((x) => x.wd >= 0 && x.wd < 6).sort((x, y) => x.wd - y.wd || x.a - y.a).map((x) => ({
      c: x.c, nome: nomeDe(x.c), t: x.t, prof: x.prof, cor: x.cor, wd: x.wd, a: x.a, b: x.b, conflito: x.conflito,
      local: x.sala ? `${x.sala.predio}, ${x.sala.nome}` : "Sala a definir",
    }));
  }
  function depoisDaGrade() { desenharGrade(); buscar(); montarConferencia(); }
  $("#gradeLimpar").onclick = () => { grade = []; guardar(); depoisDaGrade(); };
  $("#gradeQuadro").addEventListener("click", (e) => { const b = e.target.closest("[data-tirar]"); if (b) alternar(b.dataset.tirar); });
  $("#compGuardar").onclick = () => sairDoLink(true);
  $("#compFechar").onclick = () => sairDoLink(false);

  // PDF, Google Agenda e link para compartilhar
  const geradaEm = () => new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  $("#gradePdf").onclick = async (e) => {
    if (!aulas.length) return;
    const b = e.currentTarget, rotulo = b.textContent;
    b.disabled = true; b.textContent = "Gerando o PDF…";
    try { baixar(desenharPdf(await carregarJsPdf(), aulas, { geradaEm: geradaEm() }).output("blob"), "minha-grade-poli.pdf"); }
    catch { alert("Não deu para gerar o PDF agora. Confira a sua conexão e tente de novo."); }
    b.disabled = false; b.textContent = rotulo;
  };
  $("#gradeAgenda").onclick = () => {
    if (!aulas.length) return;
    baixar(gerarIcs(aulas, { hoje }), "minha-grade-poli.ics", "text/calendar;charset=utf-8");
    $("#gradeImportar").hidden = false;
    $("#gradeImportar").scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  $("#gradeCompartilhar").onclick = async () => {
    if (!grade.length) return;
    const link = `${location.origin}${location.pathname}?grade=${grade.map((k) => k.replace("|", "~")).join(".")}#grade`;
    const aviso = $("#gradeLink");
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) { await navigator.share({ title: "Minha grade", text: "A minha grade da Poli:", url: link }); return; }
      await navigator.clipboard.writeText(link);
      aviso.innerHTML = `Link copiado. Quem abrir vê esta grade, com as salas: <a href="${esc(link)}">${esc(link)}</a>`;
    } catch { aviso.innerHTML = `Copie o link: <a href="${esc(link)}">${esc(link)}</a>`; }
    aviso.hidden = false;
  };

  /* ---------- 1º ano: conferir a grade com as obrigatórias do semestre ---------- */
  const PALAVRA_CURSO = { civil: "civil", ambiental: "ambiental", computacao: "computacao", eletrica: "eletrica", mecanica: "mecanica", mecatronica: "mecatronica", producao: "producao", quimica: "quimica", naval: "naval", "materiais-metalurgica-nuclear": "materiais", "minas-petroleo": "minas" };
  const CHAVE_CONF = "gremio:conferencia";
  const conf = (() => { try { return JSON.parse(localStorage.getItem(CHAVE_CONF)) || {}; } catch { return {}; } })();
  conf.sem ??= new Date().getMonth() >= 6 ? "2" : "1";
  const selCurso = $("#confCurso");
  selCurso.innerHTML = `<option value="">Escolha o seu curso</option>` + cursosDoGuia.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join("");
  selCurso.value = conf.curso || "";
  const guardarConf = () => { try { localStorage.setItem(CHAVE_CONF, JSON.stringify(conf)); } catch {} };
  selCurso.addEventListener("change", () => { conf.curso = selCurso.value; guardarConf(); montarConferencia(); });
  $(".conferencia__semestre").addEventListener("click", (e) => { const b = e.target.closest("[data-sem]"); if (!b) return; conf.sem = b.dataset.sem; guardarConf(); montarConferencia(); });
  function montarConferencia() {
    document.querySelectorAll(".conferencia__semestre [data-sem]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.sem === conf.sem));
    const caixa = $("#conferencia");
    if (!conf.curso) { caixa.innerHTML = ""; return; }
    const g = fichas?.cursos?.[conf.curso]?.grade?.[conf.sem];
    if (!g) { caixa.innerHTML = `<p class="nota">${fichas ? "A grade deste curso ainda não está disponível." : "Carregando a grade do curso…"}</p>`; return; }
    const obrig = g.filter((d) => d[4] === "O"), eletivas = g.filter((d) => d[4] === "L");
    const naGradeC = new Set(grade.map((k) => k.split("|")[0]));
    const palavra = PALAVRA_CURSO[conf.curso];
    const faltam = obrig.filter((d) => !naGradeC.has(d[0]));
    const itens = obrig.map(([c, n, ca, ct]) => {
      const tem = naGradeC.has(c);
      const ts = turmasDe(c);
      const doCurso = ts.filter((x) => (x.grupos || []).some(([gi]) => norm(J?.grupos?.[gi]).includes(palavra)));
      const mostrar = doCurso.length ? doCurso : ts;
      const estado = tem ? "Na sua grade."
        : `Não está na sua grade aqui.${ts.length ? ` Escolha a sua turma${doCurso.length ? " (mostrando as que reservam vagas para o seu curso)" : ""}:` : J ? " Sem turma no JupiterWeb neste semestre." : ""}`;
      return `<li class="conf-item${tem ? " is-ok" : ""}">
        <span class="conf-item__marca" aria-hidden="true">${tem ? "✓" : ""}</span>
        <div><b>${esc(c)}</b> ${esc(n)} <small>${esc(textoCreditos(ca, ct))}</small>
          <p class="conf-item__estado">${esc(estado)}</p>
          ${!tem && mostrar.length ? `<details class="conf-turmas"><summary>${mostrar.length} turma${mostrar.length > 1 ? "s" : ""}</summary><ul class="turmas">${mostrar.map(itemTurma).join("")}</ul></details>` : ""}
        </div></li>`;
    }).join("");
    const resumo = !faltam.length
      ? `Todas as ${obrig.length} obrigatórias do ${conf.sem}º semestre estão na sua grade.`
      : `Faltam ${faltam.length} de ${obrig.length} obrigatórias do ${conf.sem}º semestre na sua grade aqui. Se elas estiverem no seu JupiterWeb, é só acrescentar a turma; se não estiverem, procure o Serviço de Graduação.`;
    caixa.innerHTML = `<p class="conferencia__resumo${faltam.length ? "" : " is-ok"}">${esc(resumo)}</p><ul class="conferencia__lista">${itens}</ul>
      ${eletivas.length && conf.sem === "2" ? `<details class="conf-eletivas"><summary>Optativas eletivas do 2º semestre (${eletivas.length})</summary><p class="nota">Dá para pedir no JupiterWeb, no período de matrícula.</p><ul>${eletivas.map(([c, n, ca, ct]) => `<li><b>${esc(c)}</b> ${esc(n)} <small>${esc(textoCreditos(ca, ct))}</small></li>`).join("")}</ul></details>` : ""}`;
  }

  /* ---------- 3º semestre em diante: o montador ---------- */
  const CHAVE_MONT = "gremio:montador";
  const mont = (() => { const base = { discs: [], fora: [], lotadas: false, ordem: "janelas" }; try { return { ...base, ...JSON.parse(localStorage.getItem(CHAVE_MONT)) }; } catch { return base; } })();
  let combos = [], atual = 0;
  const guardarMont = () => { try { localStorage.setItem(CHAVE_MONT, JSON.stringify(mont)); } catch {} };
  const abas = [$("#abaPrimeiro"), $("#abaDepois")];
  function abrirAba(i, foco) {
    abas.forEach((a, j) => { a.setAttribute("aria-selected", String(i === j)); a.tabIndex = i === j ? 0 : -1; $(`#${a.getAttribute("aria-controls")}`).hidden = i !== j; });
    if (foco) abas[i].focus();
    try { localStorage.setItem("gremio:montador-aba", String(i)); } catch {}
  }
  abas.forEach((a, i) => {
    a.addEventListener("click", () => abrirAba(i));
    a.addEventListener("keydown", (e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); abrirAba(1 - i, true); } });
  });
  try { if (localStorage.getItem("gremio:montador-aba") === "1") abrirAba(1); } catch {}

  $("#montBusca").addEventListener("input", () => {
    const achadas = (achar($("#montBusca").value, 8) || []).filter((d) => !mont.discs.includes(d.c));
    $("#montSugestoes").innerHTML = achadas.map((d) => { const n = turmasDe(d.c).length; return `<li><button type="button" data-add="${esc(d.c)}"><b>${esc(d.c)}</b> ${esc(nomeDe(d.c))} <small>${n} turma${n === 1 ? "" : "s"}</small></button></li>`; }).join("");
  });
  $("#montSugestoes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-add]"); if (!b) return;
    mont.discs.push(b.dataset.add); guardarMont();
    $("#montBusca").value = ""; $("#montSugestoes").innerHTML = ""; $("#montBusca").focus();
    atual = 0; desenharMontador();
  });
  $("#montEscolhidas").addEventListener("click", (e) => {
    const tirar = e.target.closest("[data-tirar-disc]");
    if (tirar) { mont.discs = mont.discs.filter((c) => c !== tirar.dataset.tirarDisc); guardarMont(); atual = 0; desenharMontador(); }
  });
  $("#montEscolhidas").addEventListener("change", (e) => {
    const cx = e.target.closest("[data-turma]");
    if (cx) { const k = cx.dataset.turma; mont.fora = cx.checked ? mont.fora.filter((x) => x !== k) : [...mont.fora, k]; guardarMont(); atual = 0; calcular(); }
    if (e.target.id === "montLotadas") { mont.lotadas = e.target.checked; guardarMont(); atual = 0; desenharMontador(); }
  });
  $("#montResultado").addEventListener("click", (e) => {
    const o = e.target.closest("[data-ordem]");
    if (o) { mont.ordem = o.dataset.ordem; guardarMont(); atual = 0; calcular(); return; }
    const p = e.target.closest("[data-passo]");
    if (p) { atual = (atual + +p.dataset.passo + combos.length) % combos.length; mostrarCombo(); return; }
    if (e.target.closest("#montUsar")) {
      if (compartilhada) sairDoLink(false);
      // o que já estava na grade e não é destas disciplinas continua lá
      grade = [...grade.filter((k) => !mont.discs.includes(k.split("|")[0])), ...combos[atual].chaves];
      guardar(); depoisDaGrade();
      $("#grade").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  function desenharMontador() {
    const caixa = $("#montEscolhidas");
    if (!mont.discs.length) { caixa.innerHTML = `<p class="mont-vazio">Nenhuma disciplina ainda. Acrescente as que você pretende cursar, uma por vez.</p>`; $("#montResultado").innerHTML = ""; combos = []; return; }
    caixa.innerHTML = `<label class="mont-lotadas"><input type="checkbox" id="montLotadas"${mont.lotadas ? " checked" : ""}> Esconder turmas sem vaga</label>
      <ul class="mont-lista">${mont.discs.map((c) => {
        const ts = turmasDe(c).filter((x) => !mont.lotadas || !lotada(x));
        const j = fichas?.indice?.[c];
        return `<li class="mont-disc">
          <div class="mont-disc__topo"><span><b>${esc(c)}</b> ${esc(nomeDe(c))}${j ? ` <small>${esc(textoCreditos(j[1], j[2]))}</small>` : ""}</span>
            <button type="button" class="chip" data-tirar-disc="${esc(c)}" aria-label="Tirar ${esc(c)} do montador">Tirar</button></div>
          ${ts.length ? `<details><summary>${ts.length === 1 ? "1 turma" : `${ts.length} turmas: desmarque as que você não quer`}</summary><ul class="mont-turmas">${ts.map((x) => `<li><label>
              <input type="checkbox" data-turma="${esc(x.c)}|${esc(x.t)}"${mont.fora.includes(`${x.c}|${x.t}`) ? "" : " checked"}>
              <span><b>Turma ${esc(x.t)}</b>${textoTipo(x) ? ` · ${esc(textoTipo(x))}` : ""} · ${esc(x.h.map(([wd, a, b]) => `${SEMANA[wd]} ${hora(a)}–${hora(b)}`).join(", "))}${x.prof.length ? ` · ${esc(x.prof.join(", "))}` : ""}${textoVagas(x) ? ` · <span class="${lotada(x) ? "is-lotada" : ""}">${esc(textoVagas(x))}</span>` : ""}</span>
            </label></li>`).join("")}</ul></details>` : `<p class="mont-disc__sem">${J ? "Sem turma com vaga neste semestre." : "Carregando as turmas…"}</p>`}
        </li>`;
      }).join("")}</ul>`;
    calcular();
  }

  function calcular() {
    const res = $("#montResultado");
    const lista = mont.discs.map((c) => ({
      c, opcoes: opcoesDe(turmasDe(c).filter((x) => x.h.length && (!mont.lotadas || !lotada(x))).map((x) => ({ c: x.c, t: x.t, tipo: x.tipo, teorica: x.teorica, h: x.h.map(([wd, a, b]) => [wd, a, b]) })))
        .filter((op) => !op.chaves.some((k) => mont.fora.includes(k))),
    }));
    const vazias = lista.filter((d) => !d.opcoes.length).map((d) => d.c);
    if (vazias.length) { res.innerHTML = `<p class="mont-aviso">Sem turma para ${esc(vazias.join(", "))}. ${J ? `Marque ao menos uma turma${vazias.length > 1 ? " de cada" : ""}.` : "Carregando as turmas do JupiterWeb…"}</p>`; combos = []; return; }
    const { combinacoes, cortado } = combinar(lista);
    if (!combinacoes.length) {
      const pares = incompativeis(lista);
      res.innerHTML = `<p class="mont-aviso">Não existe combinação sem choque de horário com estas turmas.${pares.length ? ` Não cabem juntas de jeito nenhum: ${pares.map(([a, b]) => `${esc(a)} e ${esc(b)}`).join("; ")}.` : " Tente liberar mais turmas ou tirar uma disciplina."}</p>`;
      combos = []; return;
    }
    combos = combinacoes.map((esc_) => {
      const ops = esc_.map((j, i) => lista[i].opcoes[j]);
      return { chaves: ops.flatMap((o) => o.chaves), notas: notas(ops.flatMap((o) => o.h)) };
    }).sort((a, b) => ORDENS[mont.ordem].f(a.notas, b.notas));
    atual = Math.min(atual, combos.length - 1);
    res.innerHTML = `<div class="mont-res__topo">
        <p><b>${combos.length}${cortado ? "+" : ""} grade${combos.length === 1 ? "" : "s"} sem choque de horário</b>${cortado ? " (mostrando as primeiras; desmarque turmas para ver menos)" : ""}.</p>
        <div class="mont-ordens" role="group" aria-label="Ordenar as grades">${Object.entries(ORDENS).map(([k, o]) => `<button type="button" class="chip" data-ordem="${k}" aria-pressed="${mont.ordem === k}">${o.rotulo}</button>`).join("")}</div>
      </div>
      <div class="mont-res__nav"><button type="button" class="chip" data-passo="-1" aria-label="Grade anterior">←</button><span id="montContador" aria-live="polite"></span><button type="button" class="chip" data-passo="1" aria-label="Próxima grade">→</button></div>
      <div class="grade mont-res__quadro" id="montQuadro"></div>
      <div class="mont-res__acoes"><button type="button" class="botao botao--pequeno" id="montUsar">Usar esta grade</button><p class="nota" id="montResumo"></p></div>`;
    mostrarCombo();
  }
  function mostrarCombo() {
    if (!combos.length) return;
    const c = combos[atual], { blocos } = blocosDe(c.chaves);
    $("#montContador").textContent = `${atual + 1} de ${combos.length}`;
    $("#montQuadro").innerHTML = quadroSemana(blocos, { px: 26, mini: true });
    const n = c.notas, h = Math.floor(n.janelas / 60), m = Math.round(n.janelas % 60);
    const janelas = n.janelas ? `${h ? `${h} h` : ""}${h && m ? " e " : ""}${m ? `${m} min` : ""} de janelas` : "sem janelas";
    $("#montResumo").textContent = `${n.dias} dia${n.dias === 1 ? "" : "s"} com aula, ${janelas} na semana. Turmas: ${c.chaves.map((k) => k.replace("|", " ")).join(", ")}.`;
  }
  desenharMontador();

  /* ---------- tudo ---------- */
  function tudo() { marcar(); desenharMapa(); desenharCurva(); desenharPulso(); }
  $("#pulsoAgora").addEventListener("click", () => $("#agora").click());
  const atualizado = new Date(D.atualizadoEm);
  if (!isNaN(atualizado)) {
    $("#fonteDados").insertAdjacentText("beforeend", ` Dados do USPolis de ${atualizado.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })} às ${atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}.`);
  }
  tudo(); desenharPulso(); buscar(); desenharGrade(); montarConferencia();
  setInterval(() => { desenharPulso(); if (S.seguindo) { S.min = agoraMin(); tudo(); } }, 60_000);
}
