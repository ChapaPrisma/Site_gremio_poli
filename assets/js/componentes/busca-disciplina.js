// Busca de disciplina que só aceita escolher da lista (não dá para digitar por extenso e errar a matéria).
// Entende código ("MAT2453", "mat24"), nome sem acento, erro de digitação ("calcuo"), algarismo romano ou
// arábico ("Cálculo II" = "calculo 2") e os apelidos da Poli ("algelin", "mecflu", "resmat", "fisexp"...).
// Usada no Mapa das disciplinas (componentes/mapa-disciplinas.js) e na aba Ementas do portal interno.
// As funções normalizar() e buscar() não dependem do navegador: ferramentas/testar-busca.mjs testa as duas.

const PARADAS = new Set(["a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "na", "no", "para", "com", "por", "ao", "aos", "à"]);
const ROMANOS = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };

// apelido -> o que ele quer dizer (já normalizado). Com "|", alternativas tentadas em ordem até alguma achar algo.
const APELIDOS = {
  calc: "calculo", cdi: "calculo diferencial integral", calcnum: "calculo numerico|metodos numericos", numerico: "numerico",
  algelin: "algebra linear", alglin: "algebra linear", "al": "algebra linear", gaal: "geometria analitica algebra linear",
  vetores: "vetores geometria", ga: "geometria analitica",
  mecflu: "mecanica fluidos", fluidos: "mecanica fluidos", resmat: "resistencia materiais", mecsol: "mecanica solidos",
  termo: "termodinamica", eletromag: "eletromagnetismo", eletro: "eletricidade",
  fisexp: "fisica experimental", labfis: "fisica experimental", fis: "fisica", mec: "mecanica", qui: "quimica",
  probest: "probabilidade estatistica|probabilidade|estatistica", prob: "probabilidade", estat: "estatistica", edo: "equacoes diferenciais|calculo 2",
  intro: "introducao", introcomp: "introducao computacao", mac: "mac", comp: "computacao", eng: "engenharia",
  lab: "laboratorio", desenho: "desenho", sinais: "sinais sistemas", circuitos: "circuitos eletricos",
};

export function normalizar(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/(\d)([a-z])/g, "$1 $2").replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ").trim();
}
const palavras = (s) => normalizar(s).split(" ").filter((p) => p && !PARADAS.has(p)).map((p) => ROMANOS[p] || p);

// distância de edição (troca de duas letras vizinhas conta como um erro só), com teto para sair cedo
function distancia(a, b, teto) {
  if (Math.abs(a.length - b.length) > teto) return teto + 1;
  let ant2 = null, ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const at = [i];
    let menor = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(ant[j] + 1, at[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (ant2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, ant2[j - 2] + 1);
      at.push(v); menor = Math.min(menor, v);
    }
    if (menor > teto) return teto + 1;
    ant2 = ant; ant = at;
  }
  return ant[b.length];
}

// quanto uma palavra da busca casa com uma palavra do nome: 3 igual, 2 começo, 1 com erro de digitação
function casa(q, p) {
  if (q === p) return 3;
  if (/^\d+$/.test(q) || /^\d+$/.test(p)) return 0;   // "Cálculo 2" nunca vira "Cálculo 1"
  if (q.length >= 2 && p.startsWith(q)) return 2;
  if (q.length >= 4) { const teto = q.length >= 7 ? 2 : 1; if (distancia(q, p.slice(0, q.length + teto), teto) <= teto || distancia(q, p, teto) <= teto) return 1; }
  return 0;
}

// prepara o catálogo { SIGLA: nome } uma vez só
export function indexar(catalogo) {
  const indice = Object.entries(catalogo).map(([c, n]) => ({ c, n, cn: c.toLowerCase(), p: palavras(n) }));
  indice.vocabulario = [...new Set(indice.flatMap((d) => d.p))];   // cada palavra distinta é comparada uma vez por busca
  return indice;
}

// as melhores disciplinas para o texto digitado, da mais provável para a menos
export function buscar(indice, texto, quantas = 8) {
  const bruto = normalizar(texto).replace(/ /g, "");
  if (!bruto) return [];
  // busca por código: "mat2453", "pme 31", "4323"
  const porCodigo = /^[a-z]{0,3}\d{1,7}$|^[a-z]{3}\d*$/.test(bruto)
    ? indice.filter((d) => d.cn.startsWith(bruto)).map((d) => ({ d, s: 1000 - d.c.length + (d.cn === bruto ? 100 : 0) }))
    : [];
  // busca por nome, com os apelidos trocados pelo que querem dizer ("calc 2" -> "calculo 2"); um apelido com
  // alternativas gera uma busca para cada, e vale a primeira que achar alguma coisa
  const base = palavras(texto);
  const variantes = [[]];
  for (const q of base) {
    const alts = APELIDOS[q] ? APELIDOS[q].split("|").map((a) => a.split(" ")) : [[q]];
    const novas = [];
    for (const v of variantes) for (const a of alts) novas.push([...v, ...a]);
    variantes.splice(0, variantes.length, ...novas.slice(0, 6));
  }
  if (base.length === 1 && !APELIDOS[base[0]] && APELIDOS[bruto]) variantes.splice(0, variantes.length, ...APELIDOS[bruto].split("|").map((a) => a.split(" ")));
  let porNome = [];
  for (const qs of variantes) { porNome = porNomeDe(indice, qs, 0); if (porNome.length) break; }
  // nada casou por inteiro: aceita uma palavra sem par ("calc num" acha "Métodos Numéricos")
  if (!porNome.length && !porCodigo.length) for (const qs of variantes) { if (qs.length < 2) continue; porNome = porNomeDe(indice, qs, 1); if (porNome.length) break; }
  const vistos = new Set();
  return [...porCodigo, ...porNome].sort((a, b) => b.s - a.s || a.d.c.localeCompare(b.d.c))
    .filter(({ d }) => !vistos.has(d.c) && vistos.add(d.c)).slice(0, quantas).map(({ d }) => d);
}

function porNomeDe(indice, qs, folga) {
  const achadas = [];
  // quanto cada palavra da busca casa com cada palavra do vocabulário (só as que casam)
  const notas = qs.map((q) => { const m = new Map(); for (const p of indice.vocabulario || []) { const v = casa(q, p); if (v) m.set(p, v); } return m; });
  for (const d of indice) {
    let s = 0, faltam = 0;
    for (let k = 0; k < qs.length; k++) {
      const q = qs[k], nq = notas[k];
      let m = 0;
      for (const p of d.p) { m = Math.max(m, indice.vocabulario ? nq.get(p) || 0 : casa(q, p)); if (m === 3) break; }
      if (!m && ++faltam > folga) break;
      s += m;
    }
    if (faltam > folga) continue;
    if (d.p[0] && casa(qs[0], d.p[0]) >= 2) s += 2;               // o nome começa pelo que foi digitado
    s += Math.max(0, 3 - Math.abs(d.p.length - qs.length) * 0.4);  // nomes do tamanho da busca primeiro
    achadas.push({ d, s: s - faltam * 4 });
  }
  return achadas;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let contador = 0;

// Liga a busca a um <input>: lista de sugestões acessível (combobox do ARIA), escolha só pela lista.
// aoEscolher(sigla | null) avisa a escolha (null quando a pessoa volta a digitar). Devolve { escolher, sigla }.
export function ligarBusca(input, catalogo, { aoEscolher = () => {}, extra = () => "" } = {}) {
  const indice = indexar(catalogo);
  const id = `busca-disc-${++contador}`;
  const lista = document.createElement("ul");
  lista.className = "busca-disc__lista";
  lista.id = id;
  lista.setAttribute("role", "listbox");
  lista.hidden = true;
  input.after(lista);
  Object.assign(input, { autocomplete: "off", spellcheck: false });
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-controls", id);
  let achadas = [], ativa = -1, escolhida = null;

  const fechar = () => { lista.hidden = true; input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant"); ativa = -1; };
  function mostrar() {
    achadas = buscar(indice, input.value, 8);
    if (!input.value.trim()) return fechar();
    lista.innerHTML = achadas.length
      ? achadas.map((d, i) => `<li role="option" id="${id}-${i}" data-i="${i}" aria-selected="false"><b>${esc(d.c)}</b> <span>${esc(d.n)}</span>${extra(d.c)}</li>`).join("")
      : `<li class="busca-disc__nada" role="presentation">Nenhuma disciplina com esse nome ou código. Tente o código (está no JupiterWeb) ou só uma palavra do nome.</li>`;
    lista.hidden = false; input.setAttribute("aria-expanded", "true");
    marcar(achadas.length ? 0 : -1);
  }
  function marcar(i) {
    ativa = i;
    lista.querySelectorAll("[role=option]").forEach((li, k) => li.setAttribute("aria-selected", String(k === i)));
    if (i >= 0) { input.setAttribute("aria-activedescendant", `${id}-${i}`); lista.children[i]?.scrollIntoView({ block: "nearest" }); }
    else input.removeAttribute("aria-activedescendant");
  }
  function escolher(sigla, avisar = true) {
    escolhida = sigla && catalogo[sigla] ? sigla : null;
    input.value = escolhida ? `${escolhida} · ${catalogo[escolhida]}` : "";
    input.classList.toggle("is-escolhida", !!escolhida);
    fechar();
    if (avisar) aoEscolher(escolhida);
  }
  input.addEventListener("input", () => { if (escolhida) { escolhida = null; input.classList.remove("is-escolhida"); aoEscolher(null); } mostrar(); });
  input.addEventListener("focus", () => { if (!escolhida && input.value.trim()) mostrar(); else if (escolhida) input.select(); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (lista.hidden) mostrar(); else marcar(Math.min(ativa + 1, achadas.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); marcar(Math.max(ativa - 1, 0)); }
    else if (e.key === "Enter") { if (!lista.hidden || !escolhida) e.preventDefault(); if (!lista.hidden && ativa >= 0) escolher(achadas[ativa].c); }   // Enter escolhe, nunca envia o formulário sem escolha
    else if (e.key === "Escape") { if (!lista.hidden) { e.preventDefault(); fechar(); } }
  });
  lista.addEventListener("mousedown", (e) => e.preventDefault());   // não tira o foco do campo antes do clique
  lista.addEventListener("click", (e) => { const li = e.target.closest("[data-i]"); if (li) escolher(achadas[+li.dataset.i].c); });
  input.addEventListener("blur", () => setTimeout(fechar, 120));
  return { escolher, get sigla() { return escolhida; } };
}
