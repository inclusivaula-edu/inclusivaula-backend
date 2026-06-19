import { supabase } from "../config/supabase.js";
import { runNexus7Exercises } from "../nexus7/nexus7-exercises.js";
import { internalError } from "../utils/sanitize.js";

export const generateExercises = async (req, res) => {
  try {
    const { lessonId, studentId, quantidade = 5 } = req.body;

    if (!lessonId) {
      return res.status(400).json({ success: false, error: "lessonId é obrigatório" });
    }

    const { data: lesson, error: lessonError } = await supabase
      .from("lessons").select("*").eq("id", lessonId).single();

    if (lessonError || !lesson) {
      return res.status(404).json({ success: false, error: "Aula não encontrada" });
    }

    let student = null;
    if (studentId) {
      const { data } = await supabase
        .from("students").select("*").eq("id", studentId).single();
      student = data;
    }

    const exercicios = await runNexus7Exercises({ lesson, student, quantidade });

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

    const { data, error } = await supabase
      .from("evaluations")
      .insert([{
        student_id: studentId,
        school_id: req.schoolId,
        title: "Avaliação de exercícios",
        score: score,
        max_score: 10,
        feedback: feedback || null,
        evaluation_date: new Date().toISOString().split("T")[0]
      }])
      .select().single();

    if (error) throw new Error(error.message);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};