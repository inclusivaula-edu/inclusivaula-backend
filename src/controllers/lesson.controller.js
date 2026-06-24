import { createLessonJob, getJob } from "../services/lesson.service.js";
import { generateLessonPDF } from "../services/pdf.service.js";
import { supabase } from "../config/supabase.js";
import { internalError } from "../utils/sanitize.js";
import { indexDocumentsBatch } from "../nexus7/rag.service.js";
import { saveToMemory, buildResume } from "../nexus7/memory.service.js";

export const generateLesson = async (req, res) => {
  try {
    const { tema, deficiencia, serie, duracao } = req.body;

    if (!tema || typeof tema !== "string" || tema.trim().length === 0 || tema.length > 500) {
      return res.status(400).json({ success: false, error: "Campo 'tema' é obrigatório (máx. 500 caracteres)" });
    }
    if (!serie || typeof serie !== "string" || serie.trim().length === 0 || serie.length > 100) {
      return res.status(400).json({ success: false, error: "Campo 'serie' é obrigatório (máx. 100 caracteres)" });
    }
    if (!deficiencia || typeof deficiencia !== "string" || deficiencia.trim().length === 0 || deficiencia.length > 100) {
      return res.status(400).json({ success: false, error: "Campo 'deficiencia' é obrigatório" });
    }
    if (duracao !== undefined) {
      const d = Number(duracao);
      if (!Number.isFinite(d) || d < 15 || d > 300) {
        return res.status(400).json({ success: false, error: "Campo 'duracao' deve ser um número entre 15 e 300" });
      }
    }

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

export const indexApprovedLesson = async (req, res) => {
  try {
    const { data: lesson, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !lesson) return res.status(404).json({ success: false, error: "Aula não encontrada" });
    if (lesson.user_id !== req.user.id) return res.status(403).json({ success: false, error: "Acesso negado" });
    if (!lesson.result || lesson.status !== "completed") {
      return res.status(400).json({ success: false, error: "Aula ainda não concluída" });
    }

    const inp = lesson.input || {};
    const result = lesson.result;

    // Indexa no RAG (não-bloqueante)
    indexDocumentsBatch([{
      source: "aula_aprovada",
      category: "lesson",
      title: result.titulo || `Aula: ${inp.tema || "sem tema"}`,
      content: [
        result.objetivo_geral || "",
        result.estrategia || "",
        (result.atividades || []).map(a => `${a.titulo || ""}: ${a.descricao || ""}`).join(" | ")
      ].filter(Boolean).join("\n\n"),
      metadata: {
        lesson_id: lesson.id,
        school_id: lesson.school_id,
        user_id: lesson.user_id,
        serie: inp.serie,
        disciplina: inp.disciplina,
        deficiencia: inp.deficiencia,
        student_id: inp.student_id
      }
    }]).catch(e => console.error("RAG index error:", e.message));

    // Salva na memória do aluno se tiver student_id
    if (inp.student_id) {
      saveToMemory({
        student_id: inp.student_id,
        school_id: lesson.school_id,
        user_id: lesson.user_id,
        type: "lesson",
        lesson_id: lesson.id,
        tema: inp.tema,
        disciplina: inp.disciplina,
        serie: inp.serie,
        periodo: inp.periodo,
        deficiencia: inp.deficiencia,
        resumo: buildResume("lesson", result, inp),
        bncc_codes: result.bncc_codes || []
      }).catch(e => console.error("Memory save error:", e.message));
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("indexApprovedLesson:", error.message);
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
