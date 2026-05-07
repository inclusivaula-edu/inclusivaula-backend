import { supabase } from "../config/supabase.js";

// ✅ gerar relatório IA
export const generateStudentReport = async (
  studentId
) => {

  // =========================
  // 👨‍🎓 ALUNO
  // =========================

  const {
    data: student,
    error: studentError
  } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  // 🔥 validação profissional
  if (studentError || !student) {
    throw new Error("Aluno não encontrado");
  }

  // =========================
  // 📚 AVALIAÇÕES
  // =========================

  const {
    data: evaluations
  } = await supabase
    .from("evaluations")
    .select("*")
    .eq("student_id", studentId);

  // =========================
  // 📅 FREQUÊNCIA
  // =========================

  const {
    data: attendance
  } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId);

  // =========================
  // ♿ ADAPTAÇÕES
  // =========================

  const {
    data: disabilities
  } = await supabase
    .from("student_disabilities")
    .select("*")
    .eq("student_id", studentId);

  // =========================
  // 📊 MÉDIA
  // =========================

  const totalEvaluations =
    evaluations?.length || 0;

  const averageScore =
    totalEvaluations > 0
      ? (
          evaluations.reduce(
            (acc, item) =>
              acc + Number(item.score || 0),
            0
          ) / totalEvaluations
        ).toFixed(1)
      : 0;

  // =========================
  // 📅 FREQUÊNCIA
  // =========================

  const totalAttendance =
    attendance?.length || 0;

  const presents =
    attendance?.filter(
      item => item.status === "present"
    ).length || 0;

  const attendanceRate =
    totalAttendance > 0
      ? (
          (presents / totalAttendance) * 100
        ).toFixed(0)
      : 0;

  // =========================
  // ♿ ADAPTAÇÕES
  // =========================

  const adaptationsText =
    disabilities?.length > 0
      ? disabilities
          .map(
            item =>
              `${item.type}: ${item.adaptations}`
          )
          .join(", ")
      : "Nenhuma adaptação registrada";

  // =========================
  // 🧠 PARECER IA
  // =========================

  const report = `
Aluno: ${student.name}

Média Geral: ${averageScore}

Frequência: ${attendanceRate}%

Adaptações:
${adaptationsText}

Parecer Pedagógico:

O aluno apresentou ${
    averageScore >= 7
      ? "bom desempenho"
      : "dificuldades de aprendizagem"
  } durante o período avaliado.

A frequência registrada foi de ${attendanceRate}%,
demonstrando ${
    attendanceRate >= 75
      ? "boa participação escolar"
      : "necessidade de acompanhamento pedagógico"
  }.

As adaptações pedagógicas indicam:
${adaptationsText}.
`;

  // =========================
  // 🚀 RETORNO
  // =========================

  return {
    student,
    averageScore,
    attendanceRate,
    adaptationsText,
    report
  };
};