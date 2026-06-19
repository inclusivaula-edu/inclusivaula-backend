import { createLessonJob, getJob } from "../services/lesson.service.js";
import { generateLessonPDF } from "../services/pdf.service.js";
import { supabase } from "../config/supabase.js";
import { internalError } from "../utils/sanitize.js";

export const generateLesson = async (req, res) => {
  try {
    const user = req.user;
    const job = await createLessonJob({
      ...req.body,
      user_id: user.id,
      user_email: user.email,
      school_id: req.schoolId
    });
    return res.json({ success: true, message: "Aula enviada para processamento", jobId: job.id });
  } catch (error) {
    console.error("generateLesson:", error.message);
    const isLimit = error.message?.includes("Limite") || error.message?.includes("processamento");
    const msg = isLimit ? error.message : internalError(error);
    return res.status(isLimit ? 429 : 500).json({ success: false, error: msg });
  }
};

export const getLessonStatus = async (req, res) => {
  try {
    const job = await getJob(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, error: "Job não encontrado" });

    if (job.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    return res.json({ success: true, status: job.status, data: job.result });
  } catch (error) {
    console.error("getLessonStatus:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
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

    if (lesson.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    if (lesson.status !== "completed" || !lesson.result) {
      return res.status(400).json({ success: false, error: "Aula ainda não foi gerada" });
    }

    await generateLessonPDF(lesson, res);
  } catch (error) {
    console.error("getLessonPDF:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: internalError(error) });
    }
  }
};
