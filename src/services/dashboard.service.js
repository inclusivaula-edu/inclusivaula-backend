import { supabase } from "../config/supabase.js";

export const getDashboardData = async (schoolId) => {
  const [
    { data: students },
    { data: teachers },
    { data: attendance },
    { data: evaluations },
    { data: disabilities }
  ] = await Promise.all([
    supabase.from("students").select("id").eq("school_id", schoolId),
    supabase.from("teachers").select("id").eq("school_id", schoolId),
    supabase.from("attendance").select("status").eq("school_id", schoolId),
    supabase.from("evaluations").select("score").eq("school_id", schoolId),
    supabase.from("student_disabilities").select("id").eq("school_id", schoolId)
  ]);

  const totalStudents = students?.length || 0;
  const totalTeachers = teachers?.length || 0;

  const totalAttendance = attendance?.length || 0;
  const presents = attendance?.filter(item => item.status === "present").length || 0;
  const averageAttendance = totalAttendance > 0
    ? ((presents / totalAttendance) * 100).toFixed(0)
    : 0;

  const totalEvaluations = evaluations?.length || 0;
  const averageScore = totalEvaluations > 0
    ? (evaluations.reduce((acc, item) => acc + Number(item.score || 0), 0) / totalEvaluations).toFixed(1)
    : 0;

  const lowPerformance = evaluations?.filter(item => Number(item.score) < 6).length || 0;
  const lowAttendance = attendance?.filter(item => item.status === "absent").length || 0;
  const totalDisabilities = disabilities?.length || 0;

  const insights = [];
  if (averageAttendance < 75) insights.push("A frequência média escolar está abaixo do recomendado.");
  if (averageScore < 6) insights.push("O desempenho médio escolar necessita acompanhamento pedagógico.");
  if (totalDisabilities > 0) insights.push("A escola possui alunos que demandam acompanhamento inclusivo contínuo.");

  return {
    indicators: { totalStudents, totalTeachers, averageAttendance, averageScore },
    alerts: { lowPerformance, lowAttendance },
    inclusion: { totalDisabilities },
    insights
  };
};
