// Análise semestral das ementas: as disciplinas estão ficando mais exigentes, mais leves ou mudando de ênfase?
// Lê o histórico guardado por ferramentas/ementas.mjs (assets/dados/ementas/<SIGLA>.json) e gera
//   assets/dados/ementas-analises/AAAA-S.json   a análise do semestre e a série histórica inteira
//   assets/dados/ementas-analises/indice.json   a lista das análises já feitas
// Mostrada na aba "Ementas" do portal interno (admin/#ementas). Roda sozinha duas vezes por ano
// (.github/workflows/ementas-analise.yml, em 1º de março e 1º de agosto) e pode ser rodada à mão:
//   node ferramentas/analise-ementas.mjs [AAAA-S]
//
// O que se mede é o TEXTO da ementa no JupiterWeb, não a sala de aula. Por isso a análise fala em "indícios":
// uma ementa que passa a exigir nota mínima nas provas e perde a recuperação é um indício de disciplina mais
// exigente, não uma prova disso. Os indicadores e os limites estão em INDICADORES, logo abaixo.

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dados = (p) => fileURLToPath(new URL(`../assets/dados/${p}`, import.meta.url));
const ler = (arq) => { try { return JSON.parse(readFileSync(arq, "utf8")); } catch { return null; } };
const agora = new Date();
const periodo = process.argv[2] || `${agora.getFullYear()}-${agora.getMonth() < 6 ? 1 : 2}`;
const [ANO, SEM] = periodo.split("-").map(Number);
const rotulo = `${SEM}º semestre de ${ANO}`;

/* ---------- indicadores de cada versão ---------- */
const sem = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const PARADAS = new Set("a o e de da do das dos em no na nos nas para por com sem que se um uma uns umas ao aos as os ou como mais menos sua seu suas seus sobre entre ate pelo pela pelos pelas este esta estes estas esse essa isso ser sao foi sera serao tem ter sendo cada outro outra outros outras muito nao sim tambem quando onde qual quais disciplina disciplinas aluno alunos aula aulas estudo estudos curso cursos parte partes forma formas tipo tipos atraves meio meios utilizando uso usos geral gerais basico basicos basica basicas introducao nocoes conceitos aplicacao aplicacoes".split(" "));
// palavras de conteúdo, reduzidas a um radical simples para comparar ("operações" e "operação" contam igual);
// `forma` guarda, para cada radical, a palavra como ela aparece no texto, para mostrar
const forma = new Map();
const termos = (t) => String(t || "").toLowerCase().split(/[^a-zà-ú0-9]+/).filter(Boolean).map((orig) => {
  const p = sem(orig);
  if (p.length < 5 || PARADAS.has(p) || /^\d+$/.test(p) || /[áéíóú]$/.test(orig)) return null;   // "transformá(-los)" fica de fora
  const r = p.replace(/(coes|cao|oes|aes|ais|eis|es|s)$/, "");
  if (!forma.has(r) || orig.length < forma.get(r).length) forma.set(r, orig);
  return r;
}).filter(Boolean);

const INSTRUMENTOS = {
  prova: /\bprovas?\b|\bp[1-4]\b|\bexames?\b|\bavaliacoes? escritas?\b/,
  lista: /\blistas?\b|\bexercicios?\b/,
  projeto: /\bprojetos?\b/,
  relatorio: /\brelatorios?\b/,
  trabalho: /\btrabalhos?\b/,
  seminario: /\bseminarios?\b|\bapresentac/,
  teste: /\btestes?\b|\bquiz|\bquestionarios?\b|\batividades? (semanais|em aula|online|on-line)/,
  laboratorio: /\blaboratorio|\bexperiment|\bpraticas? de laboratorio/,
  participacao: /\bparticipac|\bfrequencia\b|\bpresenca\b/,
};
const TEMAS = {
  computacao: /comput|program|software|algoritm|simula|python|matlab|linguagem|digita|numeric|codig/,
  pratica: /projet|pratic|laborat|experiment|estudo de caso|oficina|prototip|campo\b|visita/,
  teoria: /teor|demonstr|teorema|axiom|fundament|formal|deduc|modelo matematic|analitic/,
  sustentabilidade: /sustent|ambient|energia|clima|carbon|renova|recicl|residuo|emissa/,
  gestao: /gesta|econom|custo|mercad|negoci|empreend|financ|organizac|planejament|produtiv/,
  sociedade: /etic|socied|human|comunic|lideran|equipe|divers|inclus|legisla|cidadan|seguranc/,
  dados: /aprendizado de maquina|inteligencia artificial|machine learning|redes neurais|ciencia de dados|big data|estatistic|probabilid/,
};
const CLASSES = ["mais-exigente", "mais-leve", "enfase", "ajuste", "igual"];
const NUM = { uma: 1, um: 1, duas: 2, dois: 2, tres: 3, quatro: 4, cinco: 5 };

function indicadores(v) {
  const aval = sem(`${v.avaliacao}\n${v.criterio}`);
  const conteudo = `${v.resumo}\n${v.objetivos}\n${v.programa}`;
  const inst = Object.entries(INSTRUMENTOS).filter(([, re]) => re.test(aval)).map(([k]) => k);
  let provas = 0;
  for (const m of aval.matchAll(/\bp([1-4])\b/g)) provas = Math.max(provas, +m[1]);
  for (const m of aval.matchAll(/\b(\d|uma|duas|dois|tres|quatro|cinco)\s+(provas?|avaliacoes escritas)/g)) provas = Math.max(provas, NUM[m[1]] || +m[1]);
  const nota = /(?:maior|superior)\s+(?:ou\s+igual\s+)?(?:a\s+)?(\d+(?:[.,]\d+)?)|(?:>=|≥)\s*(\d+(?:[.,]\d+)?)/.exec(aval);
  const recupTexto = sem(v.recuperacao);
  const recuperacao = recupTexto.length > 5 && !/nao (ha|havera|tera|se aplica|existe|possui|oferece|sera oferecida)|sem recuperac|nao tem recuperac/.test(recupTexto);
  const anos = [...String(v.bibliografia || "").matchAll(/\b(19[5-9]\d|20[0-3]\d)\b/g)].map((m) => +m[1]).filter((a) => a <= agora.getFullYear()).sort((a, b) => a - b);
  const textoTemas = sem(conteudo);
  const temas = Object.fromEntries(Object.entries(TEMAS).map(([k, re]) => [k, (textoTemas.match(new RegExp(re.source, "g")) || []).length]));
  return {
    cred: (v.ca || 0) + (v.ct || 0),
    palavras: sem(`${v.resumo} ${v.programa}`).split(/\s+/).filter(Boolean).length,
    inst, provas,
    notaMinima: nota ? Number((nota[1] || nota[2]).replace(",", ".")) : null,
    minimoPorParte: /nota minima|media minima|cada uma das|ambas as medias|\bmp\s*(>=|≥)|\bmt\s*(>=|≥)|e\s+m[a-z]\s*(>=|≥)|desde que|condicionad/.test(aval),
    recuperacao,
    bibAno: anos.length ? anos[Math.floor(anos.length / 2)] : null,
    bibRefs: anos.length,
    temas, termos: termos(conteudo),
  };
}

/* ---------- comparação entre duas versões seguidas ---------- */
function comparar(a, b) {
  const ia = indicadores(a), ib = indicadores(b);
  const sinais = [];
  let s = 0;
  const marca = (cond, mais, txt) => { if (cond) { s += mais; sinais.push({ peso: mais, txt }); } };
  marca(ib.cred > ia.cred, 1, `créditos de ${ia.cred} para ${ib.cred}`);
  marca(ib.cred < ia.cred, -1, `créditos de ${ia.cred} para ${ib.cred}`);
  const dp = ia.palavras ? (ib.palavras - ia.palavras) / ia.palavras : 0;
  marca(ia.palavras >= 30 && dp > 0.25, 1, `programa ${Math.round(dp * 100)}% mais longo`);
  marca(ia.palavras >= 30 && dp < -0.25, -1, `programa ${Math.round(-dp * 100)}% mais curto`);
  const novos = ib.inst.filter((x) => !ia.inst.includes(x)), saiu = ia.inst.filter((x) => !ib.inst.includes(x));
  marca(ib.inst.length > ia.inst.length, 1, `avaliação ganhou ${novos.join(", ")}`);
  marca(ib.inst.length < ia.inst.length, -1, `avaliação perdeu ${saiu.join(", ")}`);
  marca(ib.provas > ia.provas && ia.provas > 0, 1, `de ${ia.provas} para ${ib.provas} provas`);
  marca(ib.provas < ia.provas && ib.provas > 0, -1, `de ${ia.provas} para ${ib.provas} provas`);
  marca(ia.notaMinima != null && ib.notaMinima != null && ib.notaMinima > ia.notaMinima, 1, `nota para passar de ${ia.notaMinima} para ${ib.notaMinima}`);
  marca(ia.notaMinima != null && ib.notaMinima != null && ib.notaMinima < ia.notaMinima, -1, `nota para passar de ${ia.notaMinima} para ${ib.notaMinima}`);
  marca(ib.minimoPorParte && !ia.minimoPorParte, 1, "passou a exigir nota mínima em parte da avaliação");
  marca(!ib.minimoPorParte && ia.minimoPorParte, -1, "deixou de exigir nota mínima em parte da avaliação");
  marca(ia.recuperacao && !ib.recuperacao, 1, "perdeu a recuperação");
  marca(!ia.recuperacao && ib.recuperacao, -1, "ganhou recuperação");
  // ênfase: como o peso dos temas se redistribuiu, e quanto do vocabulário mudou
  const tot = (t) => Object.values(t).reduce((x, y) => x + y, 0);
  const ta = tot(ia.temas), tb = tot(ib.temas);
  const fatias = (t, n) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, n ? v / n : 0]));
  const fa = fatias(ia.temas, ta), fb = fatias(ib.temas, tb);
  const desvio = ta >= 6 && tb >= 6 ? Object.keys(TEMAS).reduce((x, k) => x + Math.abs(fb[k] - fa[k]), 0) / 2 : 0;
  const ganhou = Object.keys(TEMAS).filter((k) => fb[k] - fa[k] >= 0.12), perdeu = Object.keys(TEMAS).filter((k) => fa[k] - fb[k] >= 0.12);
  const sa = new Set(ia.termos), sb = new Set(ib.termos);
  const uniao = new Set([...sa, ...sb]), inter = [...sa].filter((x) => sb.has(x)).length;
  const semelhanca = uniao.size ? inter / uniao.size : 1;
  const freq = (lista) => { const f = {}; for (const x of lista) f[x] = (f[x] || 0) + 1; return f; };
  const fA = freq(ia.termos), fB = freq(ib.termos);
  const entraram = Object.entries(fB).filter(([k]) => !sa.has(k)).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k]) => forma.get(k) || k);
  const sairam = Object.entries(fA).filter(([k]) => !sb.has(k)).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k]) => forma.get(k) || k);
  const CAMPOS = ["n", "ca", "ct", "resumo", "objetivos", "programa", "avaliacao", "criterio", "recuperacao", "bibliografia"];
  const mudou = CAMPOS.filter((k) => a[k] !== b[k]);
  const classe = !mudou.length ? "igual" : s >= 2 ? "mais-exigente" : s <= -2 ? "mais-leve" : desvio >= 0.25 || (semelhanca < 0.35 && (ganhou.length || perdeu.length)) ? "enfase" : "ajuste";
  return { pontos: s, classe, mudou, sinais, desvio: +desvio.toFixed(2), semelhanca: +semelhanca.toFixed(2), ganhou, perdeu, entraram, sairam, ia, ib };
}

/* ---------- leitura de tudo ---------- */
const pasta = dados("ementas/");
const cat = ler(dados("catalogo-disciplinas.json"))?.d || {};
const disciplinas = readdirSync(pasta).filter((f) => f.endsWith(".json")).map((f) => ler(pasta + f)).filter((e) => e && !e.naoEncontrada && e.versoes?.length);
const mudancas = [];   // cada troca de versão: { c, n, de, deV, paraV, ...comparação }
for (const e of disciplinas) {
  const vs = e.versoes.filter((v) => v.de).sort((a, b) => a.v - b.v);
  for (let i = 1; i < vs.length; i++) {
    const a = vs[i - 1], b = vs[i];
    if (!(a.programa || a.resumo) || !(b.programa || b.resumo)) continue;
    const r = comparar(a, b);
    mudancas.push({ c: e.c, n: e.n, de: b.de, deV: a.v, paraV: b.v, ...r });
  }
}
const ativaEm = (v, d) => v.de && v.de <= d && (!v.ate || v.ate >= d);
const mediana = (l) => { const s = l.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const media = (l) => { const s = l.filter((x) => x != null); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null; };
const pct = (x) => (x == null ? "?" : `${Math.round(x * 100)}%`);
const um = (x, c = 1) => (x == null ? "?" : x.toFixed(c).replace(".", ","));

/* ---------- série histórica: o retrato das ementas em vigor em 1º de julho de cada ano ---------- */
const anos = [...new Set(disciplinas.flatMap((e) => e.versoes.map((v) => +String(v.de).slice(0, 4))).filter((a) => a > 1900))].sort((a, b) => a - b);
const serie = [];
for (let a = Math.max(anos[0] || ANO, 1990); a <= ANO; a++) {
  const dia = `${a}-07-01`;
  const vig = disciplinas.map((e) => e.versoes.find((v) => ativaEm(v, dia))).filter(Boolean).map(indicadores);
  const doAno = mudancas.filter((m) => m.de.startsWith(String(a)));
  const novas = disciplinas.filter((e) => e.versoes[0]?.de?.startsWith(String(a))).length;
  const temasTot = {};
  for (const i of vig) for (const [k, v] of Object.entries(i.temas)) temasTot[k] = (temasTot[k] || 0) + v;
  const soma = Object.values(temasTot).reduce((x, y) => x + y, 0) || 1;
  serie.push({
    ano: a, emVigor: vig.length, novasDisciplinas: novas, versoesNovas: doAno.length,
    classes: Object.fromEntries(CLASSES.map((k) => [k, doAno.filter((m) => m.classe === k).length])),
    creditos: vig.length ? +media(vig.map((i) => i.cred)).toFixed(2) : null,
    palavras: mediana(vig.map((i) => i.palavras)),
    instrumentos: vig.length ? +media(vig.map((i) => i.inst.length)).toFixed(2) : null,
    comRecuperacao: vig.length ? +(vig.filter((i) => i.recuperacao).length / vig.length).toFixed(3) : null,
    comMinimoPorParte: vig.length ? +(vig.filter((i) => i.minimoPorParte).length / vig.length).toFixed(3) : null,
    bibAno: mediana(vig.map((i) => i.bibAno)),
    temas: Object.fromEntries(Object.entries(temasTot).map(([k, v]) => [k, +(v / soma).toFixed(3)])),
  });
}

/* ---------- o semestre ---------- */
const [ini, fim] = SEM === 1 ? [`${ANO}-01-01`, `${ANO}-06-30`] : [`${ANO}-07-01`, `${ANO}-12-31`];
const doSemestre = mudancas.filter((m) => m.de >= ini && m.de <= fim).sort((a, b) => Math.abs(b.pontos) - Math.abs(a.pontos) || b.desvio - a.desvio);
const conta = (l, k) => l.filter((m) => m.classe === k).length;
const indice = ler(dados("ementas.json"));
const registradas = (indice?.mudancas || []).filter((m) => m.em >= ini && m.em <= fim);

// reclamações do Mapa das disciplinas (contagens públicas; sem banco, a análise segue sem elas)
async function reclamacoes() {
  try {
    const cfg = readFileSync(fileURLToPath(new URL("../assets/js/config.js", import.meta.url)), "utf8");
    const u = /supabaseUrl:\s*"([^"]+)"/.exec(cfg)?.[1], k = /supabaseChave:\s*"([^"]+)"/.exec(cfg)?.[1];
    if (!u || !k) return null;
    const r = await fetch(`${u}/rest/v1/rpc/resumo_reclamacoes`, { method: "POST", headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json" }, body: "{}", signal: AbortSignal.timeout(20_000) });
    if (!r.ok) return null;
    const linhas = await r.json();
    const porSigla = {}, porNatureza = {};
    for (const l of linhas) {
      (porSigla[l.sigla] ||= { pessoas: +l.pessoas, por: {} }).por[l.categoria] = +l.total;
      porNatureza[l.categoria] = (porNatureza[l.categoria] || 0) + +l.total;
    }
    return { porSigla, porNatureza, pessoas: Object.values(porSigla).reduce((s, x) => s + x.pessoas, 0) };
  } catch { return null; }
}
const rec = await reclamacoes();

/* ---------- texto ---------- */
const NOME_CLASSE = { "mais-exigente": "mais exigente", "mais-leve": "mais leve", enfase: "mudou de ênfase", ajuste: "ajuste", igual: "texto igual" };
const NOME_TEMA = { computacao: "computação e programação", pratica: "prática, projeto e laboratório", teoria: "teoria e fundamentos", sustentabilidade: "energia e meio ambiente", gestao: "gestão e economia", sociedade: "ética, sociedade e comunicação", dados: "dados, estatística e IA" };
const lista = (l) => (l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} e ${l.at(-1)}`);
const texto = [];
if (doSemestre.length) {
  const FRASE = { "mais-exigente": "com indícios de ementa mais exigente", "mais-leve": "com indícios de ementa mais leve", enfase: "com mudança de ênfase", ajuste: "só com ajustes no texto", igual: "com o texto igual ao da versão anterior" };
  const partes = CLASSES.map((k) => [k, conta(doSemestre, k)]).filter(([, n]) => n).map(([k, n]) => `${n} ${FRASE[k]}`);
  texto.push(`No ${rotulo}, ${doSemestre.length === 1 ? "1 disciplina ganhou" : `${doSemestre.length} disciplinas ganharam`} versão nova da ementa no JupiterWeb: ${lista(partes)}.`);
  const fortes = doSemestre.filter((m) => !["ajuste", "igual"].includes(m.classe)).slice(0, 4);
  if (fortes.length) texto.push(`Os casos mais marcados: ${fortes.map((m) => `${m.c} (${m.n}), ${NOME_CLASSE[m.classe]}: ${m.sinais.length ? m.sinais.slice(0, 3).map((s) => s.txt).join("; ") : `o peso foi para ${lista(m.ganhou.map((t) => NOME_TEMA[t]))}`}`).join(". ")}.`);
} else texto.push(`No ${rotulo}, nenhuma disciplina acompanhada ganhou versão nova da ementa no JupiterWeb.`);
if (registradas.length) texto.push(`Desde o começo do acompanhamento, o robô registrou ${registradas.length} mudança${registradas.length === 1 ? "" : "s"} neste semestre (versões novas, edições sem troca de versão, disciplinas que entraram ou saíram do catálogo).`);

const comDados = serie.filter((s) => s.emVigor >= 30);
const ondas = [...serie].sort((a, b) => b.versoesNovas + b.novasDisciplinas - (a.versoesNovas + a.novasDisciplinas)).slice(0, 3).filter((s) => s.versoesNovas + s.novasDisciplinas > 0).sort((a, b) => a.ano - b.ano);
if (comDados.length >= 2) {
  const a = comDados[0], z = comDados.at(-1);
  const meio = comDados.find((s) => s.ano === 2015) || comDados[Math.floor(comDados.length / 2)];
  const totalVersoes = disciplinas.reduce((s, e) => s + e.versoes.length, 0);
  texto.push(`Série histórica: o JupiterWeb guarda ${totalVersoes} versões de ${disciplinas.length} disciplinas (as ativas da Poli e as de outras unidades que estão nas grades), a mais antiga de ${anos[0]}. As maiores ondas de reforma foram em ${lista(ondas.map((s) => `${s.ano} (${s.versoesNovas + s.novasDisciplinas} ementas novas)`))}.`);
  const tema = (s, k) => pct(s.temas[k]);
  texto.push(`Comparando as ementas em vigor em ${meio.ano} e em ${z.ano}: créditos médios de ${um(meio.creditos)} para ${um(z.creditos)}; programa com mediana de ${meio.palavras} para ${z.palavras} palavras; ${um(meio.instrumentos)} para ${um(z.instrumentos)} instrumentos de avaliação por disciplina; recuperação prevista em ${pct(meio.comRecuperacao)} e depois em ${pct(z.comRecuperacao)} delas; nota mínima em parte da avaliação em ${pct(meio.comMinimoPorParte)} e depois em ${pct(z.comMinimoPorParte)}; bibliografia com ano mediano ${meio.bibAno ?? "?"} e depois ${z.bibAno ?? "?"}. No vocabulário, computação e programação foi de ${tema(meio, "computacao")} para ${tema(z, "computacao")} das menções de tema, prática e projeto de ${tema(meio, "pratica")} para ${tema(z, "pratica")}, energia e meio ambiente de ${tema(meio, "sustentabilidade")} para ${tema(z, "sustentabilidade")}.`);
  const reais = mudancas.filter((m) => m.classe !== "igual"), todas = reais.length;
  if (todas) {
    const pesou = (f) => reais.filter((m) => f(m.pontos)).length;
    texto.push(`Das ${mudancas.length} trocas de versão comparáveis, ${conta(mudancas, "igual")} só renumeraram a ementa, sem mudar o texto. Nas outras ${todas}: ${pct(conta(reais, "mais-exigente") / todas)} com indícios fortes de ementa mais exigente, ${pct(conta(reais, "mais-leve") / todas)} de mais leve, ${pct(conta(reais, "enfase") / todas)} de mudança de ênfase e ${pct(conta(reais, "ajuste") / todas)} de ajustes. Somando os sinais, mesmo os fracos, ${pesou((p) => p > 0)} trocas pesaram para o lado mais exigente e ${pesou((p) => p < 0)} para o mais leve.`);
  }
}
if (rec?.pessoas) {
  const top = Object.entries(rec.porNatureza).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  const recentes = Object.keys(rec.porSigla).filter((s) => mudancas.some((m) => m.c === s && m.de >= `${ANO - 1}-01-01`));
  texto.push(`No Mapa das disciplinas, ${rec.pessoas} reclamações registradas até agora; as naturezas mais citadas: ${lista(top)}. ${recentes.length ? `Das disciplinas reclamadas, ${recentes.length} mudaram de ementa no último ano (${recentes.slice(0, 6).join(", ")}): vale olhar se a reclamação veio com a mudança.` : "Nenhuma das disciplinas reclamadas mudou de ementa no último ano."}`);
}

const metodo = [
  "Fonte: as versões das ementas no JupiterWeb, cada uma com a data em que entrou em vigor; o robô (ferramentas/ementas.mjs) guarda todas as versões que ainda são consultáveis e confere a versão vigente uma vez por mês.",
  "Cada troca de versão é comparada com a anterior. Somam pontos de exigência: mais créditos, programa mais de 25% mais longo, mais instrumentos de avaliação ou mais provas, nota para passar maior, nota mínima em parte da avaliação, fim da recuperação; o contrário subtrai. Com 2 pontos ou mais, \"mais exigente\"; com -2 ou menos, \"mais leve\".",
  "Texto igual: a versão mudou de número, mas nenhum campo do texto mudou (acontece em reorganizações de currículo). Mudança de ênfase: o peso dos temas (computação, prática e projeto, teoria, energia e meio ambiente, gestão, sociedade, dados) mudou em pelo menos 25% das menções, ou o vocabulário foi quase todo trocado. O resto é ajuste.",
  "Limites: mede o texto, não a sala de aula; uma ementa pode mudar no papel e não na prática, e vice-versa. A série só tem as disciplinas que existem hoje (as extintas não entram), então os anos antigos retratam uma parte menor da Poli. A busca por temas e instrumentos usa listas de palavras e erra em textos atípicos.",
];

/* ---------- saída ---------- */
const enxuta = (m) => ({ c: m.c, n: m.n, de: m.de, deV: m.deV, paraV: m.paraV, classe: m.classe, mudou: m.mudou, pontos: m.pontos, sinais: m.sinais.map((s) => s.txt), desvio: m.desvio, semelhanca: m.semelhanca, ganhou: m.ganhou, perdeu: m.perdeu, entraram: m.entraram, sairam: m.sairam });
const saida = {
  periodo, rotulo, geradaEm: agora.toISOString(),
  texto, metodo,
  totais: { disciplinas: disciplinas.length, versoes: disciplinas.reduce((s, e) => s + e.versoes.length, 0), trocas: mudancas.length, desde: anos[0] || null, classes: Object.fromEntries(CLASSES.map((k) => [k, conta(mudancas, k)])) },
  semestre: doSemestre.map(enxuta),
  registradas,
  ondas: ondas.map((s) => ({ ano: s.ano, versoesNovas: s.versoesNovas, novasDisciplinas: s.novasDisciplinas })),
  serie,
  maisMarcadas: [...mudancas].filter((m) => m.de >= `${ANO - 2}-01-01`).sort((a, b) => Math.abs(b.pontos) - Math.abs(a.pontos) || b.desvio - a.desvio).slice(0, 15).map(enxuta),
  reclamacoes: rec ? { pessoas: rec.pessoas, porNatureza: rec.porNatureza } : null,
  temas: NOME_TEMA, classes: NOME_CLASSE,
};
mkdirSync(dados("ementas-analises/"), { recursive: true });
writeFileSync(dados(`ementas-analises/${periodo}.json`), JSON.stringify(saida) + "\n");
const idx = (ler(dados("ementas-analises/indice.json")) || []).filter((x) => x.periodo !== periodo);
idx.push({ periodo, rotulo, geradaEm: saida.geradaEm });
idx.sort((a, b) => a.periodo.localeCompare(b.periodo));
writeFileSync(dados("ementas-analises/indice.json"), JSON.stringify(idx) + "\n");
console.log(`Análise ${periodo}: ${disciplinas.length} disciplinas, ${saida.totais.versoes} versões, ${mudancas.length} trocas comparadas (${Object.entries(saida.totais.classes).map(([k, v]) => `${v} ${k}`).join(", ")}); ${doSemestre.length} no semestre.`);
for (const p of texto) console.log(`\n${p}`);
