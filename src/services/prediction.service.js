import { supabase } from "../config/supabase.js";

export const generatePredictions = async () => {

  const predictions = [];

  const { data: students } = await supabase
    .from("students")
    .select("*");

  for (const student of students || []) {

    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("*")
      .eq("student_id", student.id);

    const averageScore =
      evaluations?.length > 0
        ? evaluations.reduce(
            (acc, item) =>
              acc + Number(item.score || 0),
            0
          ) / evaluations.length
        : 10;

    // 🔥 previsão simples IA
    let prediction =
      "Desempenho estável.";

    if (averageScore < 6) {
      prediction =
        "Possível necessidade de reforço pedagógico.";
    }

    if (averageScore < 4) {
      prediction =
        "Risco elevado de dificuldade contínua.";
    }

    predictions.push({
      student: student.name,
      averageScore: averageScore.toFixed(1),
      prediction
    });
  }

  return predictions;
};