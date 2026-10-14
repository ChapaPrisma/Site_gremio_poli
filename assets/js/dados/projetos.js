// Projetos e parcerias (com GEX e com empresas), guardados no mesmo banco Supabase das contas.
// Tabelas e regras: ferramentas/supabase/projetos.sql. Leitura pública; escrita pelo portal interno.
// Se o banco não estiver ligado ou a tabela ainda não existir, devolve listas vazias.

import { supabase } from "./contas.js?v=202610141040";

export const SITUACOES = { "planejado": "Planejado", "em-andamento": "Em andamento", "concluido": "Concluído" };

export async function carregarProjetos(site) {
  try {
    const db = await supabase(site);
    if (!db) return { ok: false, projetos: [] };
    const [p, a] = await Promise.all([
      db.from("projetos").select("*").order("inicio", { ascending: true, nullsFirst: false }),
      db.from("projetos_atualizacoes").select("*").order("data", { ascending: false }),
    ]);
    if (p.error) return { ok: false, projetos: [] };
    const atual = a.error ? [] : a.data;
    return { ok: true, projetos: p.data.map((x) => ({ ...x, atualizacoes: atual.filter((u) => u.projeto_id === x.id) })) };
  } catch {
    return { ok: false, projetos: [] };
  }
}

// Fração do prazo já percorrida (0 a 1), para a barra de andamento; null sem datas.
export function prazo(p, hoje = new Date()) {
  if (!p.inicio || !p.termino_previsto) return null;
  const a = new Date(p.inicio + "T00:00:00"), b = new Date(p.termino_previsto + "T23:59:59");
  if (b <= a) return null;
  return Math.min(1, Math.max(0, (hoje - a) / (b - a)));
}
