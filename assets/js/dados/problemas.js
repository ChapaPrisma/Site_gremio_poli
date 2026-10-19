// Mapa de problemas do campus (aluno/demandas/#mapa e o painel do portal interno): categorias, ícones e
// leitura do banco. Tabelas, regras e limites: ferramentas/supabase/problemas.sql (mesmo banco das contas).

import { supabase } from "./contas.js?v=202610190711";

// Cada categoria com o seu ícone (traços num quadro de 24 × 24, desenhados em branco sobre a cor do pino).
export const CATEGORIAS = {
  agua: { rotulo: "Água e bebedouros", cor: "#1f7ab8", icone: "M12 3.5c3 3.9 5.6 7 5.6 10.3a5.6 5.6 0 0 1-11.2 0C6.4 10.5 9 7.4 12 3.5z" },
  banheiro: { rotulo: "Banheiros", cor: "#6b4fb8", icone: "M8 3.5h4v5.5H8z M5.5 10.5h13a6.5 6.5 0 0 1-6.5 6.5 6.5 6.5 0 0 1-6.5-6.5z M9.5 17l-1 3.5h7l-1-3.5" },
  iluminacao: { rotulo: "Iluminação e energia", cor: "#c98a00", icone: "M9.5 18h5 M10.3 20.8h3.4 M12 3.3a5.8 5.8 0 0 0-3.4 10.5c.6.5.9 1.1.9 1.9V16h5v-.3c0-.8.3-1.4.9-1.9A5.8 5.8 0 0 0 12 3.3z" },
  limpeza: { rotulo: "Limpeza e lixo", cor: "#3d8a4f", icone: "M4.5 7h15 M9.5 7V4.3h5V7 M6.5 7l1 13h9l1-13 M10.5 10.5v6 M13.5 10.5v6" },
  estrutura: { rotulo: "Estrutura (goteira, piso, porta)", cor: "#8a5a32", icone: "M3.5 6h17v12h-17z M3.5 12h17 M9 6v6 M15 12v6" },
  climatizacao: { rotulo: "Calor, ar e ventilação", cor: "#c2410c", icone: "M12 3.5v17 M4.6 7.75l14.8 8.5 M4.6 16.25l14.8-8.5" },
  internet: { rotulo: "Wi-Fi e tomadas", cor: "#0e7490", icone: "M3 9.5a13 13 0 0 1 18 0 M6.3 12.8a8.2 8.2 0 0 1 11.4 0 M9.5 16a3.6 3.6 0 0 1 5 0 M12 19.3v.1" },
  acessibilidade: { rotulo: "Acessibilidade", cor: "#222e84", icone: "M12 3.5v.1 M7 7.5h10 M12 7.5v5.5 M12 13l-3.5 7 M12 13l3.5 7" },
  seguranca: { rotulo: "Segurança", cor: "#a3243c", icone: "M12 3.3l7 2.9v5.6c0 4.4-2.9 7.3-7 8.9-4.1-1.6-7-4.5-7-8.9V6.2z" },
  outro: { rotulo: "Outro problema", cor: "#4a5070", icone: "M6.5 12v.1 M12 12v.1 M17.5 12v.1" },
};

export const SITUACOES = { aberto: "Aberto", encaminhado: "Levado à diretoria", resolvido: "Resolvido", descartado: "Descartado" };
export const COLUNAS_PUBLICAS = "id, criado_em, categoria, texto, lat, lon, precisao, origem_local, tem_foto, situacao, apoios, resposta";
export const PERTO = 30;   // metros: registros mais perto que isso viram aviso de possível repetição

// Os registros visíveis ao público (o banco já esconde os descartados). { ok: false } sem banco ou sem a tabela.
export async function carregarProblemas(site, { admin = false } = {}) {
  try {
    const db = await supabase(site);
    if (!db) return { ok: false, problemas: [] };
    const { data, error } = await db.from("problemas").select(admin ? "*" : COLUNAS_PUBLICAS).order("criado_em", { ascending: false }).limit(2000);
    if (error) return { ok: false, problemas: [] };
    return { ok: true, problemas: data, db };
  } catch {
    return { ok: false, problemas: [] };
  }
}

// distância em metros entre dois pontos (lat, lon), boa para centenas de metros
export function distancia(a, b) {
  const k = Math.PI / 180, x = (b.lon - a.lon) * k * Math.cos(((a.lat + b.lat) / 2) * k), y = (b.lat - a.lat) * k;
  return Math.hypot(x, y) * 6371000;
}

// ícone num <svg> (para listas e botões do formulário)
export const iconeSvg = (cat, tam = 22) => {
  const c = CATEGORIAS[cat] || CATEGORIAS.outro;
  return `<svg class="ico-problema" width="${tam}" height="${tam}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="${c.cor}"/><path d="${c.icone}" transform="translate(12 12) scale(.62) translate(-12 -12)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};
