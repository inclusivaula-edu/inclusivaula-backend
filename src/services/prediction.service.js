import { supabase } from "../config/supabase.js";

export const generatePredictions = async (schoolId) => {
  const predictions = [];

  const { data: students } = await supabase
    .from("students")
    .select("id, name")
    .eq("school_id", schoolId);

  const studentIds = (students || []).map(s => s.id);
  if (studentIds.length === 0) return predictions;

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("student_id, score")
    .in("student_id", studentIds);

  for (const student of students) {
    const studentEvals = evaluations?.filter(e => e.student_id === student.id) || [];
    const averageScore = studentEvals.length > 0
      ? studentEvals.reduce((acc, e) => acc + Number(e.score || 0), 0) / studentEvals.length
      : 10;

    let prediction = "Desempenho estável.";
    if (averageScore < 6) prediction = "Possível necessidade de reforço pedagógico.";
    if (averageScore < 4) prediction = "Risco elevado de dificuldade contínua.";

    predictions.push({
      student: student.name,
      averageScore: averageScore.toFixed(1),
      prediction
    });
  }

  return predictions;
};
