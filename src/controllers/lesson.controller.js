import { createLessonJob, getJob } from "../services/lesson.service.js";
import { generateLessonPDF } from "../services/pdf.service.js";
import { supabase } from "../config/supabase.js";

export const generateLesson = async (req, res) => {
  try {
    const user = req.user;
    console.log("📚 Gerando aula para:", user.email);
    const job = await createLessonJob({
      ...req.body,
      user_id: user.id,
      user_email: user.email
    });
    return res.json({ success: true, message: "Aula enviada para processamento", jobId: job.id });
  } catch (error) {
    console.error("❌ ERRO generateLesson:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getLessonStatus = async (req, res) => {
  try {
    const job = await getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, error: "Job não encontrado" });
    return res.json({ success: true, status: job.status, data: job.result });
  } catch (error) {
    console.error("❌ ERRO getLessonStatus:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const getLessonPDF = async (req, res) => {
  try {
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", req.params.jobId)
      .single();

    if (error || !lesson) {
      return res.status(404).json({ success: false, error: "Aula não encontrada" });
    }

    if (lesson.status !== "completed" || !lesson.result) {
      return res.status(400).json({ success: false, error: "Aula ainda não foi gerada" });
    }

    await generateLessonPDF(lesson, res);
  } catch (error) {
    console.error("❌ ERRO getLessonPDF:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};