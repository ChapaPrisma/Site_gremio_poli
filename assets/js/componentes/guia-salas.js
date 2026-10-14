// Salas (aluno/salas/): pulso do campus, mapa de salas livres, busca de aulas e "Minha grade".
// Uso: a marcação fica em aluno/salas/index.html e <div data-componente="guia-salas"></div>.
// Dados: assets/dados/salas.json, gerado por ferramentas/salas.mjs a partir do USPolis.
//   salas      [id, prédio, nome, capacidade, andar, bandeiras(1 acessível, 2 ar, 4 audiovisual, 8 reservável)]
//   ocupacoes  [sala, data, início, fim, tipo(0 aula, 1 prova, 2 reunião, 3 evento), rótulo]
//   turmas     [disciplina, turma, [[dia da semana (0 = seg), início, fim, sala|null]], professores]
// A grade do aluno fica só no navegador dele (localStorage), sem ir a lugar nenhum.

import { hora, agoraSP, hojeSP } from "../dados/tempo.js?v=202610141915";
import { CORES, carregarJsPdf, desenharPdf, gerarIcs, baixar } from "./grade-exportar.js?v=202610141915";

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

  let D;
  try {
    const r = await fetch(new URL("assets/dados/salas.json", raiz), { cache: "no-cache" });
    D = await r.json();
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
  const turmasPor = new Map(); // disciplina -> turmas
  for (const t of D.turmas) { if (!turmasPor.has(t[0])) turmasPor.set(t[0], []); turmasPor.get(t[0]).push(t); }
  const indiceBusca = Object.entries(D.disciplinas).map(([c, n]) => ({ c, n, nc: norm(c), nn: norm(n) }));

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

    // Cobertura: quanto o USPolis registra neste dia (ele ainda não tem todas as atividades da Poli).
    const doDiaTodo = D.ocupacoes.filter((o) => o[1] === S.dia);
    const salasUsadas = new Set(doDiaTodo.map((o) => o[0])).size;
    $("#cobertura").textContent = `Neste dia o USPolis registra ${doDiaTodo.length} aulas, provas, reuniões e eventos em ${salasUsadas} das ${salas.length} salas. Ele ainda não cobre todas as atividades da Poli: uma sala verde não tem nada registrado, mas pode estar em uso. Confira no local antes de ocupar.`;

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
  function desenharPulso() {
    const total = salas.length;
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
    svg.innerHTML = `${grade}${escala}<path class="area" d="${d}"/>${agora}
      <line class="marca" x1="${x(S.min)}" x2="${x(S.min)}" y1="${topo}" y2="${base}"/>
      <circle class="marca-ponto" cx="${x(S.min)}" cy="${y(atual[1])}" r="6"/>`;
    svg.setAttribute("aria-label", `Salas livres ao longo do dia. Às ${hora(S.min)}, ${atual[1]} de ${lista.length} salas livres.`);
  }
  const escolherNaCurva = (e) => {
    const r = svg.getBoundingClientRect();
    const t = INICIO + Math.round((((e.clientX - r.left) / r.width) * (FIM - INICIO)) / 10) * 10;
    S.min = Math.min(FIM, Math.max(INICIO, t)); S.seguindo = false; tudo();
  };
  let arrastando = false;
  svg.addEventListener("pointerdown", (e) => { arrastando = true; svg.setPointerCapture(e.pointerId); escolherNaCurva(e); });
  svg.addEventListener("pointermove", (e) => { if (arrastando) escolherNaCurva(e); });
  svg.addEventListener("pointerup", () => { arrastando = false; });
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

  /* ---------- onde é a minha aula ---------- */
  let grade = lerGrade();
  const naGrade = (c, t) => grade.includes(`${c}|${t}`);
  const descreverHorario = ([wd, a, b, sala]) => {
    const s = sala != null ? porId.get(sala) : null;
    return { texto: `${SEMANA[wd] || "?"} ${hora(a)}–${hora(b)} · ${s ? `${s.predio} ${s.nome}` : "sala a definir"}`, semSala: !s };
  };
  function buscar() {
    const q = norm($("#busca").value.trim());
    const est = $("#buscaEstado"), res = $("#resultados");
    if (q.length < 2) { est.textContent = `${Object.keys(D.disciplinas).length} disciplinas e ${D.turmas.length} turmas no USPolis.`; res.innerHTML = ""; return; }
    const palavras = q.split(/\s+/);
    const achadas = indiceBusca.filter((d) => d.nc.startsWith(q) || palavras.every((p) => d.nn.includes(p) || d.nc.includes(p))).slice(0, 12);
    est.textContent = achadas.length ? (achadas.length === 12 ? "Mostrando as 12 primeiras. Refine a busca para ver outras." : `${achadas.length} disciplina${achadas.length > 1 ? "s" : ""} encontrada${achadas.length > 1 ? "s" : ""}.`) : "Nenhuma disciplina encontrada. Confira o código ou tente uma palavra do nome.";
    res.innerHTML = achadas.map((d) => `<article class="disciplina">
        <h3><span>${esc(d.c)}</span>${esc(d.n)}</h3>
        <ul class="turmas">${(turmasPor.get(d.c) || []).map(([c, t, hs, prof]) => `<li class="turma">
            <div>
              <span class="turma__cod">Turma ${esc(t)}</span>
              ${prof.length ? `<span class="turma__prof"> · ${esc(prof.join(", "))}</span>` : ""}
              <ul class="turma__horarios">${hs.map((h) => { const x = descreverHorario(h); return `<li${x.semSala ? ' class="sem-sala"' : ""}>${esc(x.texto)}</li>`; }).join("")}</ul>
            </div>
            <button type="button" class="chip" data-grade="${esc(c)}|${esc(t)}" aria-pressed="${naGrade(c, t)}">${naGrade(c, t) ? "Na sua grade" : "Adicionar à grade"}</button>
          </li>`).join("")}</ul>
      </article>`).join("");
  }
  let espera;
  $("#busca").addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(buscar, 150); });
  $("#resultados").addEventListener("click", (e) => {
    const b = e.target.closest("[data-grade]"); if (!b) return;
    const k = b.dataset.grade;
    grade = grade.includes(k) ? grade.filter((x) => x !== k) : [...grade, k];
    salvarGrade(grade);
    b.setAttribute("aria-pressed", grade.includes(k)); b.textContent = grade.includes(k) ? "Na sua grade" : "Adicionar à grade";
    desenharGrade();
  });

  /* ---------- minha grade ---------- */
  const PX_HORA = 44;
  let aulas = []; // a grade montada, para o PDF e a agenda
  function desenharGrade() {
    const quadro = $("#gradeQuadro");
    $("#gradeAcoes").hidden = $("#gradeAviso").hidden = !grade.length;
    $("#gradeImportar").hidden = true;
    aulas = [];
    if (!grade.length) { quadro.innerHTML = `<p class="grade__vazia">Sua grade está vazia. Procure uma disciplina acima e toque em "Adicionar à grade".</p>`; return; }
    const blocos = [];
    const faltando = [];
    // uma cor por disciplina: as aulas da mesma disciplina saem todas da mesma cor
    const codigos = [...new Set(grade.map((k) => k.split("|")[0]))];
    grade.forEach((k) => {
      const [c, t] = k.split("|");
      const turma = (turmasPor.get(c) || []).find((x) => x[1] === t);
      if (!turma) { faltando.push(`${c} (turma ${t})`); return; }
      const cor = CORES[codigos.indexOf(c) % CORES.length];
      for (const h of turma[2]) blocos.push({ c, t, cor, prof: turma[3] || [], wd: h[0], a: h[1], b: h[2], sala: h[3] != null ? porId.get(h[3]) : null });
    });
    for (const x of blocos) x.conflito = blocos.some((y) => y !== x && y.wd === x.wd && y.c + y.t !== x.c + x.t && y.a < x.b && x.a < y.b);
    const minutosSemana = blocos.reduce((s, x) => s + (x.b - x.a), 0);
    let html = `<div class="grade__tabela"><div class="grade__cab"></div>${SEMANA.slice(0, 6).map((d) => `<div class="grade__cab">${d}</div>`).join("")}`;
    html += `<div class="grade__horas">${Array.from({ length: 17 }, (_, i) => `<span style="top:${i * PX_HORA}px">${7 + i}h</span>`).join("")}</div>`;
    for (let wd = 0; wd < 6; wd++) {
      html += `<div class="grade__dia">${blocos.filter((x) => x.wd === wd).map((x) => {
        const top = ((Math.max(INICIO, x.a) - INICIO) / 60) * PX_HORA, alt = Math.max(28, ((Math.min(FIM, x.b) - Math.max(INICIO, x.a)) / 60) * PX_HORA - 2);
        return `<div class="bloco-aula${x.conflito ? " conflito" : ""}" style="top:${top}px;height:${alt}px;background:${x.cor}" title="${esc(`${x.c} ${D.disciplinas[x.c] || ""}, turma ${x.t}`)}">
          <b>${esc(x.c)}</b>${hora(x.a)}–${hora(x.b)}<br>${x.sala ? esc(`${x.sala.predio} ${x.sala.nome}`) : "sala a definir"}</div>`;
      }).join("")}</div>`;
    }
    html += `</div>`;
    // duração em horas e minutos e, depois, em créditos (cada crédito-aula vale 50 minutos)
    const hs = Math.floor(minutosSemana / 60), mins = minutosSemana % 60, creditos = Math.round(minutosSemana / 50);
    const duracao = [hs ? `${hs} hora${hs === 1 ? "" : "s"}` : "", mins ? `${mins} minuto${mins === 1 ? "" : "s"}` : ""].filter(Boolean).join(" e ") || "0 minutos";
    const notas = [`${grade.length - faltando.length} turma${grade.length - faltando.length === 1 ? "" : "s"}, ${duracao} de aula por semana, ${creditos} crédito${creditos === 1 ? "" : "s"}.`];
    if (blocos.some((x) => x.conflito)) notas.push("Os blocos com contorno tracejado têm conflito de horário.");
    if (faltando.length) notas.push(`Não estão mais nos dados do USPolis: ${faltando.join(", ")}.`);
    // as turmas da grade, com a cor de cada uma e o botão para tirar só aquela
    const lista = grade.map((k) => {
      const [c, t] = k.split("|"), cor = CORES[codigos.indexOf(c) % CORES.length];
      return `<li><i style="background:${cor}"></i><span><b>${esc(c)}</b> ${esc(D.disciplinas[c] || "")} <small>turma ${esc(t)}</small></span>
        <button type="button" class="chip" data-tirar="${esc(k)}" aria-label="Tirar ${esc(c)} da grade">Tirar da grade</button></li>`;
    }).join("");
    quadro.innerHTML = html + `<p class="grade__nota">${esc(notas.join(" "))}</p><ul class="grade__turmas">${lista}</ul>`;
    aulas = blocos.filter((x) => x.wd >= 0 && x.wd < 6).sort((x, y) => x.wd - y.wd || x.a - y.a).map((x) => ({
      c: x.c, nome: D.disciplinas[x.c] || "", t: x.t, prof: x.prof, cor: x.cor, wd: x.wd, a: x.a, b: x.b, conflito: x.conflito,
      local: x.sala ? `${x.sala.predio}, ${x.sala.nome}` : "Sala a definir",
    }));
  }
  $("#gradeLimpar").onclick = () => { grade = []; salvarGrade(grade); desenharGrade(); buscar(); };
  $("#gradeQuadro").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tirar]"); if (!b) return;
    grade = grade.filter((x) => x !== b.dataset.tirar); salvarGrade(grade); desenharGrade(); buscar();
  });

  // PDF e Google Agenda
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

  /* ---------- tudo ---------- */
  function tudo() { marcar(); desenharMapa(); desenharCurva(); }
  const atualizado = new Date(D.atualizadoEm);
  if (!isNaN(atualizado)) {
    $("#fonteDados").insertAdjacentText("beforeend", ` Atualizado em ${atualizado.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" })} às ${atualizado.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}.`);
  }
  tudo(); desenharPulso(); buscar(); desenharGrade();
  setInterval(() => { desenharPulso(); if (S.seguindo) { S.min = agoraMin(); tudo(); } }, 60_000);
}
