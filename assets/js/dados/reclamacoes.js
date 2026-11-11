// Reclamações sobre disciplinas (Mapa das disciplinas, aluno/demandas/disciplinas/, e o painel do portal interno):
// naturezas, leitura das contagens públicas e envio. Tabela, regras e limites: ferramentas/supabase/reclamacoes.sql.

import { supabase } from "./contas.js?v=202611102102";

// A natureza de cada reclamação, com exemplos que ajudam a escolher. O mapa não pinta por natureza (nove cores
// juntas não se distinguem): a natureza escolhida no filtro muda o que o tamanho e o tom de cada ponto contam.
export const NATUREZAS = {
  didatica: { rotulo: "Didática", dica: "aulas confusas, ritmo, pouca explicação" },
  carga: { rotulo: "Carga de trabalho", dica: "listas, projetos e relatórios além dos créditos" },
  avaliacao: { rotulo: "Provas e critério", dica: "prova que não bate com a aula, critério pouco claro" },
  conteudo: { rotulo: "Conteúdo e ementa", dica: "desatualizado, repetido, longe da prática" },
  material: { rotulo: "Material", dica: "falta material, slides ruins, livro esgotado" },
  organizacao: { rotulo: "Organização", dica: "cronograma, notas que demoram, comunicação" },
  turmas: { rotulo: "Turmas e vagas", dica: "poucas vagas, horário ruim, turma lotada" },
  laboratorio: { rotulo: "Laboratório e estrutura", dica: "equipamento quebrado, sala inadequada" },
  outro: { rotulo: "Outro", dica: "o que não cabe acima" },
};
export const SITUACOES_REC = { nova: "Nova", lida: "Lida", levada: "Levada ao departamento", descartada: "Descartada" };

// semestres que a pessoa pode ter cursado: do atual para trás, quatro anos
export function semestres(hoje = new Date()) {
  let ano = hoje.getFullYear(), sem = hoje.getMonth() < 6 ? 1 : 2;
  const lista = [];
  for (let i = 0; i < 8; i++) { lista.push(`${ano}.${sem}`); if (sem === 2) sem = 1; else { sem = 2; ano--; } }
  return lista;
}

// Contagens públicas: Map(sigla -> { pessoas, ultima, por: { natureza: total } }). { ok: false } sem banco ou sem a função.
export async function carregarResumo(site) {
  try {
    const db = await supabase(site);
    if (!db) return { ok: false, porSigla: new Map() };
    const { data, error } = await db.rpc("resumo_reclamacoes");
    if (error) return { ok: false, porSigla: new Map() };
    const porSigla = new Map();
    for (const l of data || []) {
      const r = porSigla.get(l.sigla) || { pessoas: +l.pessoas || 0, ultima: l.ultima, por: {} };
      r.por[l.categoria] = +l.total || 0;
      if (l.ultima > r.ultima) r.ultima = l.ultima;
      porSigla.set(l.sigla, r);
    }
    return { ok: true, porSigla, db };
  } catch {
    return { ok: false, porSigla: new Map() };
  }
}

// envia uma reclamação; devolve { ok } ou { erro: "texto para a pessoa" }
export async function enviarReclamacao(site, { sigla, categorias, semestre, texto }) {
  const db = await supabase(site);
  if (!db) return { erro: "O envio ainda não está ligado a um banco de dados." };
  const { error } = await db.from("reclamacoes_disciplinas").insert({ sigla, categorias, semestre: semestre || null, texto: texto?.trim() || null });
  if (!error) return { ok: true };
  if (/repetida/.test(error.message)) return { erro: "Você já comentou esta disciplina neste semestre. Obrigado: o registro anterior continua valendo." };
  if (/limite/.test(error.message)) return { erro: "Muitos envios seguidos. Espere um pouco e tente de novo." };
  return { erro: "Não deu para enviar agora. Tente de novo daqui a pouco." };
}
