import { runNexus7PEI } from "../nexus7/nexus7-pei.js";
import { runNexus7AEE } from "../nexus7/nexus7-aee.js";
import { supabase } from "../config/supabase.js";
import { internalError, sanitizeForPrompt } from "../utils/sanitize.js";
import { v4 as uuidv4 } from "uuid";

export const generatePEI = async (req, res) => {
  try {
    const { student_id, periodo, escola } = req.body;

    if (!student_id || typeof student_id !== "string") {
      return res.status(400).json({ success: false, error: "Campo 'student_id' é obrigatório" });
    }
    if (!periodo || typeof periodo !== "string" || periodo.length > 100) {
      return res.status(400).json({ success: false, error: "Campo 'periodo' é obrigatório (ex: '1º Semestre 2026')" });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("full_name, grade, disability_type, notes, guardian_name, school_id")
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
      periodo: sanitizeForPrompt(periodo),
      escola: sanitizeForPrompt(escola || ""),
      teacher: req.profile?.full_name || ""
    };

    const { error: insertError } = await supabase.from("pei_documents").insert([{
      id,
      student_id,
      user_id: req.user.id,
      school_id: req.schoolId,
      periodo,
      status: "processing",
      result: null
    }]);

    if (insertError) {
      console.error("ERRO AO INSERIR PEI:", insertError.message);
      return res.status(500).json({ success: false, error: internalError(insertError) });
    }

    setTimeout(async () => {
      try {
        const result = await runNexus7PEI(input);
        await supabase.from("pei_documents")
          .update({ status: "completed", result })
          .eq("id", id);
      } catch (err) {
        console.error("ERRO PEI JOB:", err.message);
        await supabase.from("pei_documents")
          .update({ status: "error", result: { error: "Falha ao gerar PEI" } })
          .eq("id", id);
      }
    }, 0);

    return res.json({ success: true, message: "PEI enviado para processamento", jobId: id });
  } catch (error) {
    console.error("generatePEI:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getPEIStatus = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("pei_documents")
      .select("*")
      .eq("id", req.params.jobId)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "PEI não encontrado" });
    if (data.user_id !== req.user.id && data.school_id !== req.schoolId) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    return res.json({ success: true, status: data.status, data: data.result });
  } catch (error) {
    console.error("getPEIStatus:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const listPEIs = async (req, res) => {
  try {
    const { student_id } = req.query;
    let query = supabase
      .from("pei_documents")
      .select("id, student_id, periodo, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (req.schoolId) {
      query = query.eq("school_id", req.schoolId);
    } else {
      query = query.eq("user_id", req.user.id);
    }

    if (student_id) query = query.eq("student_id", student_id);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("listPEIs:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const generateAEE = async (req, res) => {
  try {
    const { student_id, periodo, escola } = req.body;

    if (!student_id || typeof student_id !== "string") {
      return res.status(400).json({ success: false, error: "Campo 'student_id' é obrigatório" });
    }
    if (!periodo || typeof periodo !== "string" || periodo.length > 100) {
      return res.status(400).json({ success: false, error: "Campo 'periodo' é obrigatório" });
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("full_name, grade, disability_type, notes, guardian_name, school_id")
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
      periodo: sanitizeForPrompt(periodo),
      escola: sanitizeForPrompt(escola || "")
    };

    const { error: insertError } = await supabase.from("aee_documents").insert([{
      id,
      student_id,
      user_id: req.user.id,
      school_id: req.schoolId,
      periodo,
      status: "processing",
      result: null
    }]);

    if (insertError) {
      console.error("ERRO AO INSERIR AEE:", insertError.message);
      return res.status(500).json({ success: false, error: internalError(insertError) });
    }

    setTimeout(async () => {
      try {
        const result = await runNexus7AEE(input);
        await supabase.from("aee_documents")
          .update({ status: "completed", result })
          .eq("id", id);
      } catch (err) {
        console.error("ERRO AEE JOB:", err.message);
        await supabase.from("aee_documents")
          .update({ status: "error", result: { error: "Falha ao gerar plano AEE" } })
          .eq("id", id);
      }
    }, 0);

    return res.json({ success: true, message: "Plano AEE enviado para processamento", jobId: id });
  } catch (error) {
    console.error("generateAEE:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getAEEStatus = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("aee_documents")
      .select("*")
      .eq("id", req.params.jobId)
      .single();

    if (error || !data) return res.status(404).json({ success: false, error: "AEE não encontrado" });
    if (data.user_id !== req.user.id && data.school_id !== req.schoolId) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    return res.json({ success: true, status: data.status, data: data.result });
  } catch (error) {
    console.error("getAEEStatus:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const listAEEs = async (req, res) => {
  try {
    const { student_id } = req.query;
    let query = supabase
      .from("aee_documents")
      .select("id, student_id, periodo, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (req.schoolId) {
      query = query.eq("school_id", req.schoolId);
    } else {
      query = query.eq("user_id", req.user.id);
    }

    if (student_id) query = query.eq("student_id", student_id);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("listAEEs:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
