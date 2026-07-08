import { runNexus7EstudoCaso } from "../nexus7/nexus7-estudo-caso.js";
import { supabase } from "../config/supabase.js";
import { internalError, sanitizeForPrompt } from "../utils/sanitize.js";
import { v4 as uuidv4 } from "uuid";
import { generateEstudoCasoPDF } from "../services/pdf.service.js";
import { enviarDocx } from "../services/docx.service.js";

// Processa (ou reprocessa) um estudo de caso — usado na geração e na recuperação de jobs
export async function processCaseStudyJob(id, input) {
  try {
    const result = await runNexus7EstudoCaso(input);
    await supabase.from("case_studies")
      .update({ status: "completed", result })
      .eq("id", id);
  } catch (err) {
    console.error("ERRO ESTUDO DE CASO JOB:", err.message);
    await supabase.from("case_studies")
      .update({ status: "error", result: { error: "Falha ao gerar estudo de caso" } })
      .eq("id", id);
  }
}

export const generateCaseStudy = async (req, res) => {
  try {
    const { student_id, periodo, escola } = req.body;

    if (!student_id || typeof student_id !== "string") {
      return res.status(400).json({ success: false, error: "Campo 'student_id' é obrigatório" });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("full_name, grade, disability_type, notes, guardian_name, observable_behavior, what_helps, school_id")
      .eq("id", student_id)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ success: false, error: "Aluno não encontrado" });
    }
    if (student.school_id && req.schoolId && student.school_id !== req.schoolId) {
      return res.status(403).json({ success: false, error: "Acesso negado: aluno de outra escola" });
    }

    const id = uuidv4();
    const input = {
      student,
      periodo: sanitizeForPrompt(periodo || ""),
      escola: sanitizeForPrompt(escola || ""),
      teacher: req.profile?.full_name || ""
    };

    const { error: insertError } = await supabase.from("case_studies").insert([{
      id, student_id, user_id: req.user.id, school_id: req.schoolId,
      periodo: periodo || null, status: "processing", result: null
    }]);
    if (insertError) {
      console.error("ERRO AO INSERIR ESTUDO DE CASO:", insertError.message);
      return res.status(500).json({ success: false, error: internalError(insertError) });
    }

    setTimeout(() => processCaseStudyJob(id, input), 0);

    return res.json({ success: true, message: "Estudo de caso enviado para processamento", jobId: id });
  } catch (error) {
    console.error("generateCaseStudy:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getCaseStudyStatus = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("case_studies").select("*").eq("id", req.params.jobId).single();

    if (error || !data) return res.status(404).json({ success: false, error: "Estudo de caso não encontrado" });
    if (data.user_id !== req.user.id && data.school_id !== req.schoolId) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }
    return res.json({ success: true, status: data.status, data: data.result });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const listCaseStudies = async (req, res) => {
  try {
    const { student_id } = req.query;
    let query = supabase
      .from("case_studies")
      .select("id, student_id, periodo, status, aprovado, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (req.schoolId) query = query.eq("school_id", req.schoolId);
    else query = query.eq("user_id", req.user.id);
    if (student_id) query = query.eq("student_id", student_id);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getCaseStudyPDF = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("case_studies").select("*").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, error: "Estudo de caso não encontrado" });
    if (data.user_id !== req.user.id && data.school_id !== req.schoolId) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }
    if (data.status !== "completed" || !data.result || data.result.error) {
      return res.status(422).json({ success: false, error: `Estudo de caso ainda não está pronto (status: ${data.status})` });
    }

    const { data: student } = await supabase.from("students").select("*").eq("id", data.student_id).single();
    const { data: escola } = student?.school_id
      ? await supabase.from("schools").select("id, name, city, state, address, phone, inep_code, cnpj, logo_url").eq("id", student.school_id).single()
      : { data: null };

    if (req.query.formato === "docx") {
      return enviarDocx(res, "Estudo de Caso — Avaliação Biopsicossocial", data.result,
        { aluno: student?.full_name, escola: escola?.name, periodo: data.periodo },
        `estudo-de-caso-${(student?.full_name || "aluno").replace(/ /g, "-")}.docx`);
    }

    await generateEstudoCasoPDF({ result: data.result, student: student || {}, escola, periodo: data.periodo }, res);
  } catch (error) {
    console.error("getCaseStudyPDF:", error.message);
    if (!res.headersSent) return res.status(500).json({ success: false, error: internalError(error) });
  }
};
