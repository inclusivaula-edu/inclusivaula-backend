import { supabase } from "../config/supabase.js";
import { runNexus7Exercises } from "../nexus7/nexus7-exercises.js";
import { internalError } from "../utils/sanitize.js";

export const generateExercises = async (req, res) => {
  try {
    const { lessonId, studentId, quantidade = 5 } = req.body;

    if (!lessonId) {
      return res.status(400).json({ success: false, error: "lessonId é obrigatório" });
    }

    const qtd = Math.min(Math.max(Number(quantidade) || 5, 1), 20);

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons").select("*")
      .eq("id", lessonId)
      .eq("teacher_id", req.user?.id)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ success: false, error: "Aula não encontrada" });
    }

    let student = null;
    if (studentId) {
      const { data } = await supabase
        .from("students").select("*")
        .eq("id", studentId)
        .eq("school_id", req.schoolId)
        .single();
      student = data;
      if (!student) {
        return res.status(404).json({ success: false, error: "Aluno não encontrado" });
      }
    }

    const exercicios = await runNexus7Exercises({ lesson, student, quantidade: qtd });

    const { data: saved, error: saveError } = await supabase
      .from("activities")
      .insert([{
        lesson_id: lessonId,
        school_id: req.schoolId,
        teacher_id: req.user?.id,
        title: exercicios.titulo,
        description: exercicios.instrucoes,
        activity_type: "exercicios_adaptados",
        questions: exercicios.exercicios,
        gabarito: {
          criterios: exercicios.criterios_avaliacao,
          pontuacao_maxima: exercicios.pontuacao_maxima
        },
        status: "draft"
      }])
      .select().single();

    if (saveError) throw new Error(saveError.message);

    return res.json({ success: true, activityId: saved.id, data: exercicios });

  } catch (error) {
    console.error("❌ ERRO generateExercises:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getExercisesByLesson = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("activities")
      .select("*")
      .eq("lesson_id", req.params.lessonId)
      .eq("school_id", req.schoolId)
      .eq("activity_type", "exercicios_adaptados")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const registerGrade = async (req, res) => {
  try {
    const { activityId, studentId, score, feedback } = req.body;

    if (!activityId || !studentId || score === undefined || score === null) {
      return res.status(400).json({ success: false, error: "activityId, studentId e score são obrigatórios" });
    }

    const numScore = Number(score);
    if (isNaN(numScore) || numScore < 0 || numScore > 10) {
      return res.status(400).json({ success: false, error: "score deve ser um número entre 0 e 10" });
    }

    // Verifica que o aluno pertence à escola do professor
    const { data: student } = await supabase
      .from("students").select("id")
      .eq("id", studentId).eq("school_id", req.schoolId).single();

    if (!student) {
      return res.status(404).json({ success: false, error: "Aluno não encontrado" });
    }

    const { data, error } = await supabase
      .from("evaluations")
      .insert([{
        student_id: studentId,
        school_id: req.schoolId,
        title: "Avaliação de exercícios",
        score: numScore,
        max_score: 10,
        feedback: feedback ? String(feedback).substring(0, 1000) : null,
        evaluation_date: new Date().toISOString().split("T")[0]
      }])
      .select().single();

    if (error) throw new Error(error.message);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};