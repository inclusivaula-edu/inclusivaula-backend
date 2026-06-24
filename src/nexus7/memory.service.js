import { supabase } from "../config/supabase.js";

/**
 * Registra o que foi gerado para um aluno (memória de longo prazo).
 */
export async function saveToMemory({
  student_id, school_id, user_id, type,
  lesson_id, tema, disciplina, serie, periodo, deficiencia,
  resumo, bncc_codes = []
}) {
  const { error } = await supabase.from("student_learning_history").insert([{
    student_id, school_id, user_id, type,
    lesson_id, tema, disciplina, serie, periodo, deficiencia,
    resumo,
    bncc_codes: bncc_codes || []
  }]);

  if (error) console.error("Memory save error:", error.message);
}

/**
 * Recupera o histórico de aprendizado de um aluno para contextualizar
 * novas gerações. Retorna os últimos N registros.
 */
export async function getStudentMemory(student_id, limit = 15) {
  const { data, error } = await supabase
    .from("student_learning_history")
    .select("type, tema, disciplina, serie, periodo, deficiencia, resumo, bncc_codes, created_at")
    .eq("student_id", student_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) return "";

  const entries = data.reverse().map((h, i) => {
    const date = new Date(h.created_at).toLocaleDateString("pt-BR");
    const bncc = (h.bncc_codes || []).join(", ");
    return `${i + 1}. [${date}] ${h.type.toUpperCase()} — ${h.tema || "sem tema"}${h.disciplina ? ` (${h.disciplina})` : ""}${bncc ? ` · BNCC: ${bncc}` : ""}\n   Resumo: ${h.resumo}`;
  });

  return `
═══════════════════════════════════════════════
HISTÓRICO DE APRENDIZADO DO ALUNO (MEMÓRIA)
═══════════════════════════════════════════════
O aluno já teve as seguintes atividades geradas anteriormente.
Use este histórico para:
- NÃO repetir temas ou atividades já trabalhados
- Propor progressão pedagógica coerente (do simples ao complexo)
- Referenciar conceitos já estudados quando relevante
- Adaptar o nível de complexidade com base no percurso

${entries.join("\n\n")}
`;
}

/**
 * Gera um resumo curto a partir do resultado de uma aula/exercício/PEI.
 */
export function buildResume(type, result, input = {}) {
  if (!result) return "Geração sem resultado";

  switch (type) {
    case "lesson":
      return `Aula: ${result.titulo || "sem título"}. Estratégia: ${(result.estrategia || "").substring(0, 120)}. Atividades: ${(result.atividades || []).length} propostas.`;

    case "exercise":
      return `Exercícios: ${result.titulo || "sem título"}. ${(result.exercicios || []).length} questões (${(result.exercicios || []).map(e => e.tipo).join(", ")}).`;

    case "pei":
      return `PEI: ${(result.objetivos?.curto_prazo || []).length} objetivos curto prazo, ${(result.objetivos?.longo_prazo || []).length} longo prazo. AEE: ${result.aee?.frequencia || "não definido"}.`;

    case "aee":
      return `Plano AEE: ${(result.plano_atendimento?.atividades || []).length} atividades. Frequência: ${result.plano_atendimento?.frequencia || "não definida"}.`;

    case "rubrica":
      return `Rubrica: ${(result.criterios || []).length} critérios. Pontuação máxima: ${result.pontuacao_maxima || "N/A"}.`;

    default:
      return `${type}: geração concluída.`;
  }
}
