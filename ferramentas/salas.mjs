// Baixa do USPolis (sistema de alocação de salas da Poli) as salas e as ocupações dos próximos
// 14 dias e grava uma versão enxuta em assets/dados/salas.json, usada pela página aluno/salas/.
//
// O USPolis não libera chamadas diretas de outros sites pelo navegador (sem CORS), então,
// como no cardápio, o site lê o arquivo gerado aqui. Rode com Node 18+:
//   node ferramentas/salas.mjs
// Hoje roda sozinho pelo agendamento em .github/workflows/salas.yml.
//
// Cache de 1 hora (vital para não sobrecarregar o USPolis): o script consulta o USPolis no máximo uma
// vez por hora, onde quer que rode. A hora da última consulta fica em ferramentas/.cache/salas-consulta.json
// (fora do git; no GitHub Actions ela é guardada entre as execuções pelo actions/cache). Consultas
// antes de 1 hora são recusadas, mesmo se a anterior falhou. Os visitantes do site nunca chamam o
// USPolis: leem só o arquivo gerado aqui.
//
// Privacidade: de reuniões e eventos guardamos só o tipo (não o título nem quem reservou).
// De aulas e provas guardamos o código da disciplina, a turma e os professores, que já são
// públicos no Júpiter. Se o USPolis falhar, o arquivo anterior é mantido.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API = "https://www.uspolis.com.br/api";
// uma consulta ao USPolis por hora, no máximo (55 min de trava: o agendador do GitHub atrasa ou adianta
// alguns segundos, e com 60 min exatos uma rodada podia pular a hora inteira)
const INTERVALO_MINIMO = 55 * 60_000;
const trava = fileURLToPath(new URL("./.cache/salas-consulta.json", import.meta.url));
const DIAS = 14;
const arquivo = fileURLToPath(new URL("../assets/dados/salas.json", import.meta.url));

const pedir = async (caminho) => {
  const r = await fetch(API + caminho, { signal: AbortSignal.timeout(60_000), headers: { "User-Agent": "Site do Gremio Politecnico (dados de salas)" } });
  if (!r.ok) throw new Error(`${caminho}: HTTP ${r.status}`);
  return r.json();
};

// Data no fuso de São Paulo (AAAA-MM-DD), somando dias.
const diaSP = (soma = 0) => {
  const d = new Date(Date.now() + soma * 864e5);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
};
const minutos = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const limpa = (s) => String(s || "").replace(/\s+/g, " ").trim();

async function gerar() {
  const inicio = diaSP(0), fim = diaSP(DIAS - 1);
  const [salasApi, eventos] = await Promise.all([
    pedir("/classrooms/full/"),
    pedir(`/allocations/events?start=${inicio}&end=${fim}`),
  ]);

  // Prédios e salas (bandeiras: 1 acessível, 2 ar-condicionado, 4 audiovisual, 8 reservável).
  // Salas de teste do próprio sistema ficam de fora.
  const validas = salasApi.filter((s) => !/^teste?$/i.test(limpa(s.name)));
  const predios = [...new Set(validas.map((s) => s.building))].sort((a, b) => a.localeCompare(b, "pt"));
  const salas = validas
    .map((s) => [s.id, predios.indexOf(s.building), limpa(s.name), s.capacity || 0, s.floor ?? null,
      (s.accessibility ? 1 : 0) | (s.air_conditioning ? 2 : 0) | (s.audiovisual && s.audiovisual !== "none" ? 4 : 0) | (s.reservable ? 8 : 0)])
    .sort((a, b) => a[1] - b[1] || a[2].localeCompare(b[2], "pt", { numeric: true }));
  const salaIds = new Set(salas.map((s) => s[0]));

  // Ocupações concretas dentro da janela: [sala, data, início, fim, tipo, rótulo].
  // tipo: 0 aula, 1 prova, 2 reunião, 3 evento.
  const TIPO = { subject: 0, exam: 1, meeting: 2, event: 3 };
  const disciplinas = {};
  const turmas = new Map(); // "codigo|turma" -> { c, t, n, prof, h: Map }
  const ocupacoes = [];

  const anotaTurma = (cd, salaId) => {
    if (!cd || !cd.subject_code) return;
    disciplinas[cd.subject_code] = limpa(cd.subject_name);
    const chave = `${cd.subject_code}|${cd.code}`;
    if (!turmas.has(chave)) turmas.set(chave, { c: cd.subject_code, t: String(cd.code), prof: (cd.professors || []).map(limpa), h: new Map() });
    const hora = `${cd.week_day}|${cd.start_time.slice(0, 5)}|${cd.end_time.slice(0, 5)}`;
    const atual = turmas.get(chave).h.get(hora);
    if (!atual || (atual[3] == null && salaId != null)) {
      turmas.get(chave).h.set(hora, [cd.week_day, minutos(cd.start_time), minutos(cd.end_time), salaId ?? null]);
    }
  };

  for (const ev of eventos) {
    const tipo = TIPO[ev.type] ?? 3;
    const cd = ev.extendedProps?.class_data;
    const rd = ev.extendedProps?.reservation_data;
    if (ev.rrule) {
      // Repetições semanais sem sala: aulas ainda não alocadas. Entram só na busca de turmas.
      const ativa = ev.rrule.until.slice(0, 10) >= inicio && ev.rrule.dtstart.slice(0, 10) <= fim;
      if (ativa && cd) anotaTurma(cd, null);
      continue;
    }
    if (!ev.classroom_id || !salaIds.has(ev.classroom_id)) { if (cd) anotaTurma(cd, null); continue; }
    const data = ev.start.slice(0, 10);
    if (data < inicio || data > fim) continue;
    const ini = minutos(ev.start.slice(11, 16)), fimMin = ev.end.slice(0, 10) > data ? 24 * 60 : minutos(ev.end.slice(11, 16));
    let rotulo = "";
    if (tipo === 0 && cd) { rotulo = `${cd.subject_code}|${cd.code}`; anotaTurma(cd, ev.classroom_id); }
    else if (tipo === 1) rotulo = rd?.subject_code || "";
    ocupacoes.push([ev.classroom_id, data, ini, fimMin, tipo, rotulo]);
  }
  ocupacoes.sort((a, b) => a[0] - b[0] || a[1].localeCompare(b[1]) || a[2] - b[2]);
  // O USPolis às vezes devolve a mesma ocupação duas vezes.
  const vistas = new Set();
  const unicas = ocupacoes.filter((o) => { const k = o.join("|"); if (vistas.has(k)) return false; vistas.add(k); return true; });

  const listaTurmas = [...turmas.values()]
    .map((x) => [x.c, x.t, [...x.h.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]), x.prof])
    .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

  return {
    atualizadoEm: new Date().toISOString(),
    fonte: "USPolis, sistema de alocação de salas da Poli (uspolis.com.br)",
    janela: { inicio, fim },
    predios,
    salas,
    ocupacoes: unicas,
    disciplinas,
    turmas: listaTurmas,
  };
}

// Salas fora dos prédios da Poli (como o "LCG 1 e 2", na FAU) só entram se o USPolis registrar alguma
// ocupação nelas na janela ou se alguma turma da Poli tiver aula lá. Sem isso, elas aparecem sempre como
// livres e engordam o total. Se a Poli voltar a ter aula num desses prédios, a sala reaparece sozinha.
const PREDIOS_DA_POLI = new Set(["Biênio", "Civil", "Elétrica", "Mecânica", "Metalúrgica e Materiais", "Minas e Petróleo", "Produção", "Química"]);
export function soOQueAPoliUsa(dados) {
  const usadas = new Set(dados.ocupacoes.map((o) => o[0]));
  for (const [, , horarios] of dados.turmas) for (const h of horarios) if (h[3] != null) usadas.add(h[3]);
  const fica = (s) => PREDIOS_DA_POLI.has(dados.predios[s[1]]) || usadas.has(s[0]);
  const salas = dados.salas.filter(fica);
  const predios = [...new Set(salas.map((s) => dados.predios[s[1]]))].sort((a, b) => a.localeCompare(b, "pt"));
  return { ...dados, predios, salas: salas.map((s) => [s[0], predios.indexOf(dados.predios[s[1]]), ...s.slice(2)]) };
}

// a trava de 1 hora vem antes de qualquer chamada ao USPolis
let ultima = 0;
try { ultima = JSON.parse(readFileSync(trava, "utf8")).consultadoEm || 0; } catch {}
const passou = Date.now() - ultima;
if (passou < INTERVALO_MINIMO) {
  console.log(`USPolis consultado há ${Math.round(passou / 60_000)} min. A próxima só na hora seguinte; arquivo atual mantido.`);
  process.exit(0);
}
mkdirSync(fileURLToPath(new URL("./.cache/", import.meta.url)), { recursive: true });
writeFileSync(trava, JSON.stringify({ consultadoEm: Date.now() }));

try {
  const dados = soOQueAPoliUsa(await gerar());
  let anterior = null;
  try { anterior = JSON.parse(readFileSync(arquivo, "utf8")); } catch {}
  const semData = (o) => o && JSON.stringify({ ...o, atualizadoEm: null });
  if (semData(anterior) === semData(dados)) {
    console.log("Salas sem mudanças.");
  } else {
    mkdirSync(fileURLToPath(new URL("../assets/dados/", import.meta.url)), { recursive: true });
    writeFileSync(arquivo, JSON.stringify(dados) + "\n");
    console.log(`assets/dados/salas.json: ${dados.salas.length} salas, ${dados.ocupacoes.length} ocupações, ${dados.turmas.length} turmas (${dados.janela.inicio} a ${dados.janela.fim}).`);
  }
} catch (erro) {
  console.error("USPolis não respondeu como esperado:", erro.message, "Arquivo anterior mantido.");
  process.exit(1);
}
