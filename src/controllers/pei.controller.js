import { runNexus7PEI } from "../nexus7/nexus7-pei.js";
import { runNexus7PDI } from "../nexus7/nexus7-pdi.js";
import { runNexus7AEE } from "../nexus7/nexus7-aee.js";
import { supabase } from "../config/supabase.js";
import { internalError, sanitizeForPrompt } from "../utils/sanitize.js";
import { v4 as uuidv4 } from "uuid";
import { generatePEIPDF, generateAEEPDF, generatePDIPDF } from "../services/pdf.service.js";
import { enviarDocx } from "../services/docx.service.js";
import { veTodosDaEscola } from "../utils/visibility.js";

// Compila o desempenho curricular real do aluno (frequência, notas, AEE)
// para fundamentar o diagnóstico pedagógico do PEI/PDI em dados, não em suposição.
async function montarDesempenho(studentId, schoolId) {
  try {
    const [freqRes, notasRes, sessoesRes] = await Promise.all([
      supabase.from("attendance").select("status, present").eq("student_id", studentId).eq("school_id", schoolId).limit(400),
      supabase.from("evaluations").select("title, score, max_score, evaluation_date").eq("student_id", studentId).eq("school_id", schoolId).order("evaluation_date", { ascending: false }).limit(10),
      supabase.from("aee_sessions").select("data_sessao, evolucao").eq("student_id", studentId).eq("school_id", schoolId).order("data_sessao", { ascending: false }).limit(5)
    ]);

    const partes = [];

    const freq = freqRes.data || [];
    if (freq.length > 0) {
      const presentes = freq.filter(a => a.status === "present" || a.present === true).length;
      const faltas = freq.length - presentes;
      const taxa = ((presentes / freq.length) * 100).toFixed(0);
      partes.push(`Frequência: ${taxa}% de presença (${presentes} presenças e ${faltas} falta(s) em ${freq.length} registros)`);
    }

    const notas = notasRes.data || [];
    if (notas.length > 0) {
      const media = (notas.reduce((s, n) => s + (Number(n.score) / (Number(n.max_score) || 10)) * 10, 0) / notas.length).toFixed(1);
      const lista = notas.slice(0, 6).map(n =>
        `${sanitizeForPrompt(String(n.title || "Avaliação").substring(0, 60))}: ${n.score}/${n.max_score || 10}${n.evaluation_date ? ` (${n.evaluation_date})` : ""}`
      ).join("; ");
      partes.push(`Avaliações (média geral ${media}/10, ${notas.length} registro(s)): ${lista}`);
    }

    const sessoes = sessoesRes.data || [];
    if (sessoes.length > 0) {
      const evolucoes = sessoes.filter(s => s.evolucao).slice(0, 3)
        .map(s => `${s.data_sessao}: ${sanitizeForPrompt(String(s.evolucao).substring(0, 200))}`).join(" | ");
      partes.push(`Atendimentos AEE recentes (${sessoes.length} sessão(ões))${evolucoes ? ` — evolução registrada: ${evolucoes}` : ""}`);
    }

    return partes.length > 0 ? partes.join("\n") : null;
  } catch (err) {
    console.error("montarDesempenho:", err.message);
    return null; // desempenho é enriquecimento — nunca deve travar a geração
  }
}

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
      .select("*")
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
      desempenho: await montarDesempenho(student_id, req.schoolId),
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
      .select("id, student_id, periodo, status, doc_type, aprovado, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (req.schoolId) {
      query = query.eq("school_id", req.schoolId);
    } else {
      query = query.eq("user_id", req.user.id);
    }
    // Professor comum só vê os documentos que ele mesmo gerou
    if (!veTodosDaEscola(req.role)) {
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

export const approvePEI = async (req, res) => {
  try {
    const { data, error } = await supabase.from("pei_documents")
      .select("id, user_id, school_id").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, error: "PEI não encontrado" });
    if (data.user_id !== req.user.id && data.school_id !== req.schoolId)
      return res.status(403).json({ success: false, error: "Acesso negado" });
    await supabase.from("pei_documents").update({ aprovado: true }).eq("id", req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getPEIPDF = async (req, res) => {
  try {
    const { data, error } = await supabase.from("pei_documents").select("*").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, error: "PEI não encontrado" });

    const isAdmin = ["coordenador_municipal","coordenador_estadual","secretario_municipal",
      "secretario_estadual","diretor","coordenador"].includes(req.cargo);
    if (!isAdmin && data.user_id !== req.user.id && data.school_id !== req.schoolId)
      return res.status(403).json({ success: false, error: "Acesso negado" });

    if (data.status !== "completed" || !data.result || data.result.error) {
      return res.status(422).json({ success: false, error: `PEI ainda não está pronto (status: ${data.status || "desconhecido"})` });
    }

    const { data: student } = await supabase.from("students").select("*").eq("id", data.student_id).single();
    const { data: escola } = student?.school_id
      ? await supabase.from("schools").select("id, name, city, state, address, phone, inep_code, cnpj, logo_url").eq("id", student.school_id).single()
      : { data: null };

    const tituloDoc = data.doc_type === "pdi"
      ? "PDI — Plano de Desenvolvimento Individual"
      : "PEI — Plano Educacional Individualizado";

    if (req.query.formato === "docx") {
      const slug = data.doc_type === "pdi" ? "pdi" : "pei";
      return enviarDocx(res, tituloDoc, data.result,
        { aluno: student?.full_name, escola: escola?.name, periodo: data.periodo },
        `${slug}-${(student?.full_name || "aluno").replace(/ /g, "-")}.docx`);
    }

    const render = data.doc_type === "pdi" ? generatePDIPDF : generatePEIPDF;
    await render({ result: data.result, student: student || {}, escola, periodo: data.periodo }, res);
  } catch (error) {
    console.error("getPEIPDF:", error.message);
    if (!res.headersSent) return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const approveAEE = async (req, res) => {
  try {
    const { data, error } = await supabase.from("aee_documents")
      .select("id, user_id, school_id").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, error: "AEE não encontrado" });
    if (data.user_id !== req.user.id && data.school_id !== req.schoolId)
      return res.status(403).json({ success: false, error: "Acesso negado" });
    await supabase.from("aee_documents").update({ aprovado: true }).eq("id", req.params.id);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getAEEPDF = async (req, res) => {
  try {
    const { data, error } = await supabase.from("aee_documents").select("*").eq("id", req.params.id).single();
    if (error || !data) return res.status(404).json({ success: false, error: "AEE não encontrado" });

    const isAdmin = ["coordenador_municipal","coordenador_estadual","secretario_municipal",
      "secretario_estadual","diretor","coordenador"].includes(req.cargo);
    if (!isAdmin && data.user_id !== req.user.id && data.school_id !== req.schoolId)
      return res.status(403).json({ success: false, error: "Acesso negado" });

    if (data.status !== "completed" || !data.result || data.result.error) {
      return res.status(422).json({ success: false, error: `Plano AEE ainda não está pronto (status: ${data.status || "desconhecido"})` });
    }

    const { data: student } = await supabase.from("students").select("*").eq("id", data.student_id).single();
    const { data: escola } = student?.school_id
      ? await supabase.from("schools").select("id, name, city, state, address, phone, inep_code, cnpj, logo_url").eq("id", student.school_id).single()
      : { data: null };

    if (req.query.formato === "docx") {
      return enviarDocx(res, "Plano AEE — Atendimento Educacional Especializado", data.result,
        { aluno: student?.full_name, escola: escola?.name, periodo: data.periodo },
        `plano-aee-${(student?.full_name || "aluno").replace(/ /g, "-")}.docx`);
    }

    await generateAEEPDF({ result: data.result, student: student || {}, escola, periodo: data.periodo }, res);
  } catch (error) {
    console.error("getAEEPDF:", error.message);
    if (!res.headersSent) return res.status(500).json({ success: false, error: internalError(error) });
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
      .select("*")
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
    // Professor comum só vê os documentos que ele mesmo gerou
    if (!veTodosDaEscola(req.role)) {
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


// PDI — Plano de Desenvolvimento Individual (mesmo fluxo do PEI, doc_type "pdi")
export const generatePDI = async (req, res) => {
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
      .select("*")
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
      desempenho: await montarDesempenho(student_id, req.schoolId),
      periodo: sanitizeForPrompt(periodo),
      escola: sanitizeForPrompt(escola || ""),
      teacher: req.profile?.full_name || ""
    };

    const { error: insertError } = await supabase.from("pei_documents").insert([{
      id, student_id, user_id: req.user.id, school_id: req.schoolId,
      periodo, status: "processing", result: null, doc_type: "pdi"
    }]);
    if (insertError) {
      console.error("ERRO AO INSERIR PDI:", insertError.message);
      return res.status(500).json({ success: false, error: internalError(insertError) });
    }

    setTimeout(async () => {
      try {
        const result = await runNexus7PDI(input);
        await supabase.from("pei_documents")
          .update({ status: "completed", result })
          .eq("id", id);
      } catch (err) {
        console.error("ERRO PDI JOB:", err.message);
        await supabase.from("pei_documents")
          .update({ status: "error", result: { error: "Falha ao gerar PDI" } })
          .eq("id", id);
      }
    }, 0);

    return res.json({ success: true, message: "PDI enviado para processamento", jobId: id });
  } catch (error) {
    console.error("generatePDI:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
