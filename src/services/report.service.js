import { supabase } from "../config/supabase.js";

// ✅ gerar relatório IA
export const generateStudentReport = async (studentId) => {

  // 🔥 aluno
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  // 🔥 avaliações
  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("*")
    .eq("student_id", studentId);

  // 🔥 frequência
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId);

  // 🔥 adaptações
  const { data: disabilities } = await supabase
    .from("student_disabilities")
    .select("*")
    .eq("student_id", studentId);

  // 🔥 cálculos simples
  const totalEvaluations = evaluations?.length || 0;

  const averageScore =
    totalEvaluations > 0
      ? evaluations.reduce(
          (acc, item) => acc + Number(item.score || 0),
          0
        ) / totalEvaluations
      : 0;

  const totalAttendance = attendance?.length || 0;

  const presents =
    attendance?.filter(
      item => item.status === "present"
    ).length || 0;

  const attendanceRate =
    totalAttendance > 0
      ? ((presents / totalAttendance) * 100).toFixed(0)
      : 0;

  // 🔥 adaptações
  const adaptationsText =
    disabilities?.map(
      item => `${item.type}: ${item.adaptations}`
    ).join(", ") || "Nenhuma adaptação registrada";

  // 🔥 parecer IA inicial
  const report = `
Aluno: ${student?.name}

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

  return {
    student,
    averageScore,
    attendanceRate,
    report
  };
};