// "Minha grade" (aluno/salas/) para fora do site: PDF (desenhado com jsPDF, A4 deitado) e
// arquivo de agenda (.ics) com cada aula se repetindo toda semana, para importar no Google Agenda.
// Recebe as aulas já montadas por guia-salas.js:
//   { c, nome, t, prof: [], cor: "#hex", wd (0 = seg), a, b (minutos), local, conflito }
// As funções de desenho não dependem do navegador, para poderem ser testadas no Node.

// Uma cor por disciplina: as duas (ou mais) aulas da mesma disciplina saem com a mesma cor. Tons claros com a
// mesma luminosidade (o texto escuro é legível em todos), em ordem de matizes bem diferentes entre vizinhos:
// azul, amarelo, verde, coral, lilás, turquesa, laranja, rosa, lima, areia, céu e terracota.
export const CORES = ["#a9c1ff", "#ffd96b", "#9fe0b4", "#ffb09c", "#cdb6ff", "#8fdbe2", "#ffc48a", "#f6a9cf", "#cfe58a", "#d9cbb4", "#b4dcff", "#e8b39b"];

const SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const TINTA = [15, 31, 61], SUAVE = [74, 84, 112], LINHA = [218, 212, 201];

/* ---------- PDF ---------- */
let carregando;
export function carregarJsPdf() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  carregando ??= new Promise((ok, erro) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => ok(window.jspdf.jsPDF);
    s.onerror = () => { carregando = null; erro(new Error("jsPDF")); };
    document.head.appendChild(s);
  });
  return carregando;
}

export function desenharPdf(JsPDF, aulas, { geradaEm }) {
  const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297, H = 210, M = 12;

  // cabeçalho
  doc.setTextColor(...TINTA).setFont("helvetica", "bold").setFontSize(20).text("Minha grade", M, M + 8);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...SUAVE)
    .text(`Gerada em ${geradaEm} no site da chapa Prisma. Salas segundo o USPolis: confira no Júpiter antes da primeira aula.`, M, M + 14);
  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...TINTA).text("Chapa Prisma", W - M, M + 8, { align: "right" });

  // legenda: uma linha por disciplina, em duas colunas
  const disciplinas = [];
  for (const x of aulas) if (!disciplinas.some((d) => d.c === x.c && d.t === x.t)) disciplinas.push(x);
  const linhasLeg = Math.ceil(disciplinas.length / 2), alturaLeg = linhasLeg * 6 + 6;

  // quadro
  const nd = aulas.some((x) => x.wd === 5) ? 6 : 5;
  const hIni = Math.min(...aulas.map((x) => Math.floor(x.a / 60))), hFim = Math.max(...aulas.map((x) => Math.ceil(x.b / 60)));
  const x0 = M + 11, x1 = W - M, yCab = M + 20, y0 = yCab + 8, y1 = H - M - alturaLeg - 4;
  const col = (x1 - x0) / nd, ph = (y1 - y0) / Math.max(1, hFim - hIni);
  const yDe = (min) => y0 + ((min - hIni * 60) / 60) * ph;

  doc.setFillColor(239, 234, 226).rect(x0, yCab, x1 - x0, 8, "F");
  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(...TINTA);
  for (let d = 0; d < nd; d++) doc.text(SEMANA[d], x0 + col * d + col / 2, yCab + 5.4, { align: "center" });
  doc.setDrawColor(...LINHA).setLineWidth(0.2);
  for (let h = hIni; h <= hFim; h++) {
    const y = yDe(h * 60);
    doc.line(x0, y, x1, y);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...SUAVE).text(`${h}h`, x0 - 2, y + 1.2, { align: "right" });
  }
  for (let d = 1; d < nd; d++) doc.line(x0 + col * d, y0, x0 + col * d, y1);
  doc.setDrawColor(...TINTA).setLineWidth(0.6).line(x0, y0, x1, y0);

  // blocos das aulas
  for (const x of aulas) {
    if (x.wd >= nd) continue;
    const bx = x0 + col * x.wd + 1, bw = col - 2, by = yDe(x.a) + 0.4, bh = Math.max(5, yDe(x.b) - yDe(x.a) - 0.8);
    doc.setFillColor(...hex(x.cor)).setDrawColor(...TINTA).setLineWidth(0.35);
    if (x.conflito) doc.setDrawColor(196, 48, 79).setLineDashPattern([1.2, 0.8], 0);
    doc.roundedRect(bx, by, bw, bh, 1.4, 1.4, "FD");
    doc.setLineDashPattern([], 0);
    const linhas = [
      { t: x.c, f: "bold", s: 8.5 },
      { t: `${hhmm(x.a)}–${hhmm(x.b)}`, f: "normal", s: 7.2 },
      ...doc.setFontSize(7.2).splitTextToSize(x.local, bw - 3).map((t) => ({ t, f: "normal", s: 7.2 })),
      ...doc.setFontSize(6.8).splitTextToSize(x.nome, bw - 3).map((t) => ({ t, f: "italic", s: 6.8 })),
    ];
    let y = by + 3.6;
    doc.setTextColor(...TINTA);
    for (const l of linhas) {
      if (y > by + bh - 0.8) break;
      doc.setFont("helvetica", l.f).setFontSize(l.s).text(l.t, bx + 1.6, y);
      y += l.s * 0.42;
    }
  }

  // legenda
  let yl = y1 + 7;
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(...TINTA).text("Disciplinas", M, yl - 1.5);
  const larg = (W - 2 * M) / 2;
  disciplinas.forEach((x, i) => {
    const lx = M + (i % 2) * larg, ly = yl + 3 + Math.floor(i / 2) * 6;
    doc.setFillColor(...hex(x.cor)).setDrawColor(...TINTA).setLineWidth(0.3).roundedRect(lx, ly - 3.2, 4, 4, 0.8, 0.8, "FD");
    const texto = `${x.c}  ${x.nome} (turma ${x.t})${x.prof.length ? ` · ${x.prof.join(", ")}` : ""}`;
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...TINTA).text(doc.splitTextToSize(texto, larg - 10)[0], lx + 6, ly);
  });
  return doc;
}

/* ---------- agenda (.ics) ---------- */
const escIcs = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
// Dobra linhas longas (o formato pede no máximo 75 bytes por linha).
const dobrar = (linha) => {
  const partes = []; let atual = "", bytes = 0;
  for (const ch of linha) {
    const n = new TextEncoder().encode(ch).length;
    if (bytes + n > (partes.length ? 74 : 75)) { partes.push(atual); atual = ""; bytes = 0; }
    atual += ch; bytes += n;
  }
  partes.push(atual);
  return partes.join("\r\n ");
};

// hoje: "AAAA-MM-DD" (fuso de São Paulo). Cada aula começa no primeiro dia da semana dela a partir de hoje.
export function gerarIcs(aulas, { hoje, agora = new Date() }) {
  const base = new Date(hoje + "T12:00:00Z");
  const data = (wd) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + (((wd + 1) % 7) - d.getUTCDay() + 7) % 7);
    return d.toISOString().slice(0, 10).replace(/-/g, "");
  };
  const local = (dia, min) => `${dia}T${hhmm(min).replace(":", "")}00`;
  const carimbo = agora.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const linhas = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gremio Politecnico da USP//Minha grade//PT-BR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    "X-WR-CALNAME:Minha grade (Poli)", "X-WR-TIMEZONE:America/Sao_Paulo",
    "BEGIN:VTIMEZONE", "TZID:America/Sao_Paulo", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:-0300", "TZOFFSETTO:-0300", "TZNAME:-03", "END:STANDARD", "END:VTIMEZONE",
  ];
  for (const x of aulas) {
    const dia = data(x.wd);
    linhas.push(
      "BEGIN:VEVENT",
      `UID:${`${x.c}-${x.t}-${x.wd}-${x.a}`.replace(/[^\w-]/g, "")}@gremiopolitecnico.com.br`,
      `DTSTAMP:${carimbo}`,
      `DTSTART;TZID=America/Sao_Paulo:${local(dia, x.a)}`,
      `DTEND;TZID=America/Sao_Paulo:${local(dia, x.b)}`,
      "RRULE:FREQ=WEEKLY",
      `SUMMARY:${escIcs(`${x.c} ${x.nome}`)}`,
      `LOCATION:${escIcs(x.local)}`,
      `DESCRIPTION:${escIcs(`Turma ${x.t}${x.prof.length ? `\nProfessores: ${x.prof.join(", ")}` : ""}\nSala segundo o USPolis. Grade montada no site da chapa Prisma.`)}`,
      "END:VEVENT",
    );
  }
  linhas.push("END:VCALENDAR");
  return linhas.map(dobrar).join("\r\n") + "\r\n";
}

export function baixar(conteudo, nome, tipo) {
  const blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
