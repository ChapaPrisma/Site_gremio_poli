// Contas do Grêmio: leitura (Transparência) e escrita (portal interno).
// Com site.contas preenchido em config.js, usa o banco Supabase (leitura pública, escrita só para
// administradores, atualização ao vivo). Sem isso, lê assets/dados/contas.json, só leitura.
// Tabelas e regras: ferramentas/supabase/contas.sql. Passo a passo: ferramentas/supabase/LEIA-ME.md.

import { hojeSP } from "./tempo.js?v=202610120941";

export const INICIO_CONTAS = "2027-01-01";
export const CATEGORIAS = ["Eventos", "Serviços", "Loja", "Projetos", "Patrocínio", "Doações", "Estrutura e manutenção", "Pessoal", "Taxas e impostos", "Dívida", "Outros"];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const reais = (v) => moeda.format(Number(v) || 0);
export const dataBR = (iso) => { const [a, m, d] = String(iso).split("-"); return `${d}/${m}/${a}`; };

let cliente = null;
export const configurado = (site) => Boolean(site.contas?.supabaseUrl && site.contas?.supabaseChave);

// Cliente Supabase, carregado só quando o banco está configurado.
export async function supabase(site) {
  if (!configurado(site)) return null;
  if (!cliente) {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    cliente = createClient(site.contas.supabaseUrl, site.contas.supabaseChave);
  }
  return cliente;
}

// Lê lançamentos e parâmetros. Devolve { modo, lancamentos, parametros }.
export async function carregar(site, raiz) {
  // Selic diária (para corrigir a dívida), gerada por ferramentas/selic.mjs; sem ela, a dívida fica sem correção.
  const selic = fetch(new URL("assets/dados/selic.json", raiz), { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const db = await supabase(site);
  if (db) {
    const [l, p] = await Promise.all([
      db.from("lancamentos").select("*").order("data", { ascending: true }).order("criado_em", { ascending: true }),
      db.from("parametros").select("*"),
    ]);
    if (l.error) throw l.error;
    if (p.error) throw p.error;
    return { modo: "banco", lancamentos: l.data, parametros: Object.fromEntries(p.data.map((x) => [x.chave, x.valor])), selic: await selic };
  }
  const r = await fetch(new URL("assets/dados/contas.json", raiz), { cache: "no-cache" });
  const j = await r.json();
  return { modo: "arquivo", lancamentos: j.lancamentos || [], parametros: j.parametros || {}, selic: await selic };
}

// Avisa quando algo muda no banco (ao vivo). Sem banco, não faz nada.
export async function ouvir(site, aoMudar) {
  const db = await supabase(site);
  if (!db) return () => {};
  const canal = db.channel("contas-do-gremio")
    .on("postgres_changes", { event: "*", schema: "public", table: "lancamentos" }, aoMudar)
    .on("postgres_changes", { event: "*", schema: "public", table: "parametros" }, aoMudar)
    .subscribe();
  return () => db.removeChannel(canal);
}

// Extrato desde o começo de 2027, em ordem, com o saldo acumulado em cada linha.
export function extrato(lancamentos, parametros, selic = null, hoje = hojeSP()) {
  const inicial = Number(parametros?.saldo_inicial?.valor) || 0;
  let saldo = inicial, receitas = 0, despesas = 0, pagoDivida = 0;
  const pagamentos = [];
  const linhas = lancamentos
    .filter((l) => l.data >= INICIO_CONTAS)
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data) || String(a.criado_em || "").localeCompare(String(b.criado_em || "")))
    .map((l) => {
      const v = Number(l.valor) || 0;
      if (l.tipo === "receita") { saldo += v; receitas += v; } else { saldo -= v; despesas += v; if (l.abate_divida) { pagoDivida += v; pagamentos.push([l.data, v]); } }
      return { ...l, valor: v, saldo };
    });
  const d = parametros?.divida;
  const totalDivida = d?.total == null ? null : Number(d.total);
  const em = (ate) => dividaCorrigida(d, pagamentos, selic, ate);
  const agora = totalDivida == null ? null : em(hoje);
  return {
    linhas, saldo, receitas, despesas, inicial, inicialDefinido: parametros?.saldo_inicial?.valor != null,
    // divida.total: valor na data-base; divida.atual: hoje, com a Selic e menos os pagamentos; divida.em(data): em qualquer data
    divida: { total: totalDivida, paga: pagoDivida, dataBase: d?.data_base || null, atual: agora?.valor ?? null, juros: agora?.juros ?? 0, corrigida: Boolean(agora?.corrigida), taxaAnual: agora?.taxaAnual ?? null, em },
  };
}

// Dívida corrigida pela Selic até a data `ate` (sem contar o próprio dia): o valor da data-base
// rende a taxa Selic de cada dia útil e cai a cada pagamento lançado. Depois do último dia já
// publicado pelo Banco Central, repete a última taxa conhecida em cada dia útil (estimativa).
// Sem data-base ou sem a série da Selic, devolve o valor sem correção, só menos os pagamentos.
const proxDia = (iso) => new Date(Date.parse(iso + "T12:00:00Z") + 864e5).toISOString().slice(0, 10);
const diaUtil = (iso) => { const w = new Date(iso + "T12:00:00Z").getUTCDay(); return w > 0 && w < 6; };
export function dividaCorrigida(divida, pagamentos, selic, ate) {
  if (divida?.total == null) return null;
  const inicio = divida.data_base || null;
  const pags = pagamentos.filter(([d]) => !inicio || d >= inicio).sort((a, b) => a[0].localeCompare(b[0]));
  let valor = Number(divida.total), juros = 0, k = 0;
  const pagar = (ateDia) => { while (k < pags.length && pags[k][0] <= ateDia) valor -= pags[k++][1]; valor = Math.max(0, valor); };
  const render = (dia, taxa) => { pagar(dia); const j = valor * (taxa / 100); valor += j; juros += j; };
  const serie = selic?.diaria || [];
  if (!inicio || !serie.length) { pagar(ate); return { valor, juros: 0, corrigida: false, taxaAnual: null }; }
  let ultimoDia = null, ultimaTaxa = serie[serie.length - 1][1];
  for (const [dia, taxa] of serie) {
    if (dia < inicio) continue;
    if (dia >= ate) break;
    render(dia, taxa); ultimoDia = dia; ultimaTaxa = taxa;
  }
  // dias úteis ainda sem taxa publicada: estimados com a última taxa, ajustada para os 252 dias úteis
  // do ano da Selic (o calendário aqui conta todos os dias de semana, inclusive feriados)
  const ultimaPublicada = serie[serie.length - 1][0], estimada = ((1 + ultimaTaxa / 100) ** (252 / 261) - 1) * 100;
  for (let dia = ultimoDia ? proxDia(ultimoDia) : inicio; dia < ate; dia = proxDia(dia)) {
    if (dia <= ultimaPublicada || !diaUtil(dia)) continue;
    render(dia, estimada);
  }
  pagar(ate);
  return { valor, juros, corrigida: true, taxaAnual: ((1 + ultimaTaxa / 100) ** 252 - 1) * 100 };
}
