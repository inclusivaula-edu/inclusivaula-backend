import { supabase } from "../config/supabase.js";

export const generateAlerts = async () => {

  const alerts = [];

  // 🔥 alunos
  const { data: students } = await supabase
    .from("students")
    .select("*");

  for (const student of students || []) {

    // =========================
    // 📉 FREQUÊNCIA
    // =========================

    const { data: attendance } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", student.id);

    const totalAttendance =
      attendance?.length || 0;

    const presents =
      attendance?.filter(
        item => item.status === "present"
      ).length || 0;

    const attendanceRate =
      totalAttendance > 0
        ? (presents / totalAttendance) * 100
        : 100;

    if (attendanceRate < 75) {

      alerts.push({
        type: "low_attendance",

        student: student.name,

        message:
          "Aluno com frequência abaixo do recomendado.",

        value: attendanceRate.toFixed(0) + "%"
      });
    }

    // =========================
    // 📚 DESEMPENHO
    // =========================

    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("*")
      .eq("student_id", student.id);

    const totalEvaluations =
      evaluations?.length || 0;

    const averageScore =
      totalEvaluations > 0
        ? evaluations.reduce(
            (acc, item) =>
              acc + Number(item.score || 0),
            0
          ) / totalEvaluations
        : 10;

    if (averageScore < 6) {

      alerts.push({
        type: "low_performance",

        student: student.name,

        message:
          "Aluno com desempenho abaixo da média.",

        value: averageScore.toFixed(1)
      });
    }

    // =========================
    // 🚨 RISCO PEDAGÓGICO
    // =========================

    if (
      attendanceRate < 75 &&
      averageScore < 6
    ) {

      alerts.push({
        type: "pedagogical_risk",

        student: student.name,

        message:
          "Aluno apresenta risco pedagógico e necessita intervenção.",

        value: "ALTO"
      });
    }
  }

  return alerts;
};