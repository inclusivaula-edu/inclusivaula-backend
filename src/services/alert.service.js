import { supabase } from "../config/supabase.js";

export const generateAlerts = async (schoolId) => {
  const alerts = [];

  const { data: students } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("school_id", schoolId);

  const studentIds = (students || []).map(s => s.id);
  if (studentIds.length === 0) return alerts;

  const [
    { data: attendance },
    { data: evaluations }
  ] = await Promise.all([
    supabase.from("attendance").select("student_id, status").in("student_id", studentIds),
    supabase.from("evaluations").select("student_id, score").in("student_id", studentIds)
  ]);

  for (const student of students) {
    const studentAttendance = attendance?.filter(a => a.student_id === student.id) || [];
    const totalAttendance = studentAttendance.length;
    const presents = studentAttendance.filter(a => a.status === "present").length;
    const attendanceRate = totalAttendance > 0 ? (presents / totalAttendance) * 100 : 100;

    if (attendanceRate < 75) {
      alerts.push({
        type: "low_attendance",
        student: student.full_name,
        message: "Aluno com frequência abaixo do recomendado.",
        value: attendanceRate.toFixed(0) + "%"
      });
    }

    const studentEvals = evaluations?.filter(e => e.student_id === student.id) || [];
    const totalEvals = studentEvals.length;
    const averageScore = totalEvals > 0
      ? studentEvals.reduce((acc, e) => acc + Number(e.score || 0), 0) / totalEvals
      : 10;

    if (averageScore < 6) {
      alerts.push({
        type: "low_performance",
        student: student.full_name,
        message: "Aluno com desempenho abaixo da média.",
        value: averageScore.toFixed(1)
      });
    }

    if (attendanceRate < 75 && averageScore < 6) {
      alerts.push({
        type: "pedagogical_risk",
        student: student.full_name,
        message: "Aluno apresenta risco pedagógico e necessita intervenção.",
        value: "ALTO"
      });
    }
  }

  return alerts;
};
