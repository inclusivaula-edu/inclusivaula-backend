import { supabase }
from "../config/supabase.js";

export const getExecutiveDashboard =
async (schoolId) => {

  // =========================
  // 👨‍🎓 ALUNOS
  // =========================

  const { data: students } =
    await supabase
      .from("students")
      .select("*")
      .eq("school_id", schoolId);

  // =========================
  // 👨‍🏫 PROFESSORES
  // =========================

  const { data: teachers } =
    await supabase
      .from("teachers")
      .select("*")
      .eq("school_id", schoolId);

  // =========================
  // 📚 AVALIAÇÕES
  // =========================

  const { data: evaluations } =
    await supabase
      .from("evaluations")
      .select("*")
      .eq("school_id", schoolId);

  // =========================
  // 📅 FREQUÊNCIA
  // =========================

  const { data: attendance } =
    await supabase
      .from("attendance")
      .select("*")
      .eq("school_id", schoolId);

  // =========================
  // ♿ INCLUSÃO
  // =========================

  const { data: disabilities } =
    await supabase
      .from("student_disabilities")
      .select("*")
      .eq("school_id", schoolId);

  // =========================
  // 📊 MÉTRICAS
  // =========================

  const totalStudents =
    students?.length || 0;

  const totalTeachers =
    teachers?.length || 0;

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
  // 🚨 RISCO
  // =========================

  const lowPerformance =
    evaluations?.filter(
      item => Number(item.score) < 6
    ).length || 0;

  const criticalAttendance =
    attendance?.filter(
      item => item.status === "absent"
    ).length || 0;

  // =========================
  // 🧠 IA EXECUTIVA
  // =========================

  const insights = [];

  if (attendanceRate < 75) {

    insights.push(
      "A escola apresenta frequência média abaixo do recomendado."
    );
  }

  if (averageScore < 6) {

    insights.push(
      "O desempenho escolar necessita intervenção pedagógica institucional."
    );
  }

  if (disabilities?.length > 0) {

    insights.push(
      "A escola possui demanda significativa de acompanhamento inclusivo."
    );
  }

  if (
    lowPerformance > 10
  ) {

    insights.push(
      "Há quantidade elevada de alunos com baixo desempenho."
    );
  }

  return {

    indicators: {

      totalStudents,

      totalTeachers,

      averageScore,

      attendanceRate
    },

    risks: {

      lowPerformance,

      criticalAttendance
    },

    inclusion: {

      totalDisabilities:
        disabilities?.length || 0
    },

    insights
  };
};