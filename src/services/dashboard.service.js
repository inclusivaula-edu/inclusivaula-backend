import { supabase } from "../config/supabase.js";

// ✅ dashboard IA
export const getDashboardData = async () => {

  // 🔥 alunos
  const { data: students } = await supabase
    .from("students")
    .select("*");

  // 🔥 professores
  const { data: teachers } = await supabase
    .from("teachers")
    .select("*");

  // 🔥 frequência
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*");

  // 🔥 avaliações
  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("*");

  // 🔥 adaptações
  const { data: disabilities } = await supabase
    .from("student_disabilities")
    .select("*");

  // =========================
  // 📊 MÉTRICAS
  // =========================

  const totalStudents = students?.length || 0;

  const totalTeachers = teachers?.length || 0;

  // 🔥 frequência média
  const totalAttendance = attendance?.length || 0;

  const presents =
    attendance?.filter(
      item => item.status === "present"
    ).length || 0;

  const averageAttendance =
    totalAttendance > 0
      ? ((presents / totalAttendance) * 100).toFixed(0)
      : 0;

  // 🔥 média escolar
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
  // 🚨 ALERTAS
  // =========================

  const lowPerformance =
    evaluations?.filter(
      item => Number(item.score) < 6
    ).length || 0;

  const lowAttendance =
    attendance?.filter(
      item => item.status === "absent"
    ).length || 0;

  // =========================
  // ♿ INCLUSÃO
  // =========================

  const totalDisabilities =
    disabilities?.length || 0;

  // =========================
  // 🧠 INSIGHTS IA
  // =========================

  const insights = [];

  if (averageAttendance < 75) {
    insights.push(
      "A frequência média escolar está abaixo do recomendado."
    );
  }

  if (averageScore < 6) {
    insights.push(
      "O desempenho médio escolar necessita acompanhamento pedagógico."
    );
  }

  if (totalDisabilities > 0) {
    insights.push(
      "A escola possui alunos que demandam acompanhamento inclusivo contínuo."
    );
  }

  return {
    indicators: {
      totalStudents,
      totalTeachers,
      averageAttendance,
      averageScore
    },

    alerts: {
      lowPerformance,
      lowAttendance
    },

    inclusion: {
      totalDisabilities
    },

    insights
  };
};