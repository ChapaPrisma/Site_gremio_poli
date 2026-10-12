// Contas do Grêmio: leitura (Transparência) e escrita (portal interno).
// Com site.contas preenchido em config.js, usa o banco Supabase (leitura pública, escrita só para
// administradores, atualização ao vivo). Sem isso, lê assets/dados/contas.json, só leitura.
// Tabelas e regras: ferramentas/supabase/contas.sql. Passo a passo: ferramentas/supabase/LEIA-ME.md.

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
  const db = await supabase(site);
  if (db) {
    const [l, p] = await Promise.all([
      db.from("lancamentos").select("*").order("data", { ascending: true }).order("criado_em", { ascending: true }),
      db.from("parametros").select("*"),
    ]);
    if (l.error) throw l.error;
    if (p.error) throw p.error;
    return { modo: "banco", lancamentos: l.data, parametros: Object.fromEntries(p.data.map((x) => [x.chave, x.valor])) };
  }
  const r = await fetch(new URL("assets/dados/contas.json", raiz), { cache: "no-cache" });
  const j = await r.json();
  return { modo: "arquivo", lancamentos: j.lancamentos || [], parametros: j.parametros || {} };
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
export function extrato(lancamentos, parametros) {
  const inicial = Number(parametros?.saldo_inicial?.valor) || 0;
  let saldo = inicial, receitas = 0, despesas = 0, pagoDivida = 0;
  const linhas = lancamentos
    .filter((l) => l.data >= INICIO_CONTAS)
    .slice()
    .sort((a, b) => a.data.localeCompare(b.data) || String(a.criado_em || "").localeCompare(String(b.criado_em || "")))
    .map((l) => {
      const v = Number(l.valor) || 0;
      if (l.tipo === "receita") { saldo += v; receitas += v; } else { saldo -= v; despesas += v; if (l.abate_divida) pagoDivida += v; }
      return { ...l, valor: v, saldo };
    });
  const totalDivida = parametros?.divida?.total == null ? null : Number(parametros.divida.total);
  return { linhas, saldo, receitas, despesas, inicial, inicialDefinido: parametros?.saldo_inicial?.valor != null, divida: { total: totalDivida, paga: pagoDivida } };
}
