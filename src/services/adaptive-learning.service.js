import {
  getStudentMemories
} from "./memory.service.js";

// ✅ gerar adaptação inteligente
export const generateAdaptiveInsights =
async (studentId) => {

  const memories =
    await getStudentMemories(studentId);

  const insights = [];

  // =========================
  // 📉 FREQUÊNCIA
  // =========================

  const attendanceIssues =
    memories.filter(
      item =>
        item.type ===
        "attendance_pattern"
    );

  if (attendanceIssues.length >= 3) {

    insights.push(
      "Aluno possui recorrência de baixa frequência. Recomenda-se acompanhamento familiar e pedagógico."
    );
  }

  // =========================
  // 📚 APRENDIZAGEM
  // =========================

  const learningIssues =
    memories.filter(
      item =>
        item.type ===
        "learning_pattern"
    );

  if (learningIssues.length >= 3) {

    insights.push(
      "Aluno apresenta dificuldades contínuas de aprendizagem. Recomenda-se reforço adaptado."
    );
  }

  // =========================
  // ♿ ADAPTAÇÕES
  // =========================

  const adaptations =
    memories.filter(
      item =>
        item.type ===
        "adaptation_pattern"
    );

  if (adaptations.length >= 1) {

    insights.push(
      "Aluno responde melhor com estratégias pedagógicas adaptadas e acompanhamento contínuo."
    );
  }

  // =========================
  // 🧠 EVOLUÇÃO IA
  // =========================

  if (memories.length >= 10) {

    insights.push(
      "O Nexus7 já possui histórico suficiente para personalização pedagógica avançada."
    );
  }

  return {
    totalMemories: memories.length,
    insights
  };
};