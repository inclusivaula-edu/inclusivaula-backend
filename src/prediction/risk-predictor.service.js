import { supabase } from "../config/supabase.js";

export const predictStudentRisk = async (schoolId) => {

  // 🔥 alunos
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId);

  // 🔥 avaliações
  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("*")
    .eq("school_id", schoolId);

  // 🔥 frequência
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("school_id", schoolId);

  const risks = [];

  for (const student of students) {

    const studentEval = evaluations.filter(
      e => e.student_id === student.id
    );

    const studentAttendance = attendance.filter(
      a => a.student_id === student.id
    );

    const avgScore =
      studentEval.length > 0
        ? studentEval.reduce(
            (acc, e) => acc + Number(e.score || 0),
            0
          ) / studentEval.length
        : 0;

    const attendanceRate =
      studentAttendance.length > 0
        ? (studentAttendance.filter(a => a.status === "present").length /
           studentAttendance.length) * 100
        : 100;

    // 🚨 RISCO DE EVASÃO
    if (avgScore < 5 && attendanceRate < 70) {

      risks.push({
        student: student.name,
        risk: "HIGH_RISK_DROP_OUT",
        reason: "Baixo desempenho + baixa frequência"
      });
    }

    // 📉 RISCO MÉDIO
    if (avgScore < 6 || attendanceRate < 80) {

      risks.push({
        student: student.name,
        risk: "MEDIUM_RISK",
        reason: "Desempenho ou frequência abaixo do ideal"
      });
    }
  }

  return {
    totalStudents: students.length,
    risks
  };
};