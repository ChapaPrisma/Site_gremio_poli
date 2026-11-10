// Testes da busca de disciplinas (assets/js/componentes/busca-disciplina.js) com o catálogo de verdade
// (assets/dados/catalogo-disciplinas.json). Rode: node ferramentas/testar-busca.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { normalizar, indexar, buscar } from "../assets/js/componentes/busca-disciplina.js";

const cat = JSON.parse(readFileSync(fileURLToPath(new URL("../assets/dados/catalogo-disciplinas.json", import.meta.url)), "utf8"));
const nomes = Object.fromEntries(Object.entries(cat.d).map(([s, v]) => [s, Array.isArray(v) ? v[0] : v]));
const indice = indexar(nomes);
let ok = 0, falhas = 0;
const confere = (nome, cond, detalhe = "") => { if (cond) ok++; else { falhas++; console.log(`FALHOU: ${nome} ${detalhe}`); } };
const primeira = (q) => buscar(indice, q, 8)[0]?.c;
const entre = (q, sigla, n = 3) => buscar(indice, q, 8).slice(0, n).some((d) => d.c === sigla);
const mostra = (q) => buscar(indice, q, 5).map((d) => `${d.c} ${d.n}`).join(" | ");

confere("normalizar acentos e romanos", normalizar("Cálculo Diferencial II") === "calculo diferencial ii");
confere("normalizar separa número", normalizar("MAT2453") === "mat 2453");
const testes = [
  ["MAT2453", "MAT2453"], ["mat2453", "MAT2453"], ["calculo 1", "MAT2453"], ["Cálculo I", "MAT2453"], ["calculo diferencial e integral i", "MAT2453"],
  ["calc 2", "MAT2454"], ["calcuo 2", "MAT2454"], ["cálculo II", "MAT2454"], ["fisica 1", "4323101"], ["física II", "4323102"], ["fis 1", "4323101"],
  ["mecanica 1", "PME3100"], ["mecânica I", "PME3100"], ["mecanca 1", "PME3100"], ["quimica geral", "QFL2131"], ["estatistica", "PRO3200"],
];
for (const [q, s] of testes) {
  if (!nomes[s]) { console.log(`(pulado: ${s} não está no catálogo)`); continue; }
  confere(`"${q}" -> ${s}`, entre(q, s), `veio: ${mostra(q)}`);
}
// números nunca se confundem
confere("calculo 2 não traz Cálculo I primeiro", primeira("calculo 2") !== "MAT2453", mostra("calculo 2"));
// busca por prefixo de código traz só daquele departamento
confere("prefixo PME", buscar(indice, "pme", 8).every((d) => d.c.startsWith("PME")), mostra("pme"));
confere("prefixo 4323", buscar(indice, "4323", 8).every((d) => d.c.startsWith("4323")), mostra("4323"));
// texto sem sentido não traz nada
confere("sem resultado para lixo", buscar(indice, "xqzwv", 8).length === 0, mostra("xqzwv"));
// apelidos
for (const [q, termo] of [["algelin", "algebra linear"], ["resmat", "resistencia"], ["mecflu", "fluidos"], ["termo", "termodinamica"], ["eletromag", "eletromagnet"]]) {
  const r = buscar(indice, q, 5);
  if (!indice.some((d) => normalizar(d.n).includes(termo))) { console.log(`(pulado: nenhuma disciplina com "${termo}")`); continue; }
  confere(`apelido ${q}`, r.length && normalizar(r[0].n).includes(termo), mostra(q));
}
// desempenho: 1000 buscas
const t0 = performance.now();
for (let i = 0; i < 1000; i++) buscar(indice, ["calc 2", "mecanica", "algelin", "pme31", "fisica experimental"][i % 5], 8);
const ms = (performance.now() - t0) / 1000;
confere("rápida (< 8 ms por busca)", ms < 8, `${ms.toFixed(2)} ms`);
console.log(`\nBusca de disciplinas: ${ok} verificações ok, ${falhas} falhas (${Object.keys(nomes).length} disciplinas, ${ms.toFixed(2)} ms por busca).`);
process.exit(falhas ? 1 : 0);
