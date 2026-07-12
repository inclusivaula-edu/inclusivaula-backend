import { supabase } from "../config/supabase.js";
import { internalError, sanitizeForPrompt } from "../utils/sanitize.js";
import { generateFrequenciaAEEPDF } from "../services/pdf.service.js";
import { runNexus7Evolucao } from "../nexus7/nexus7-evolucao.js";
import { veTodosDaEscola } from "../utils/visibility.js";

export const listSessions = async (req, res) => {
  try {
    const { student_id, periodo } = req.query;
    let query = supabase.from("aee_sessions")
      .select("*")
      .order("data_sessao", { ascending: false })
      .limit(500);

    if (req.schoolId) query = query.eq("school_id", req.schoolId);
    else             query = query.eq("user_id", req.user.id);
    // Professor comum só vê os atendimentos que ele mesmo registrou
    if (!veTodosDaEscola(req.role)) query = query.eq("user_id", req.user.id);
    if (student_id)  query = query.eq("student_id", student_id);
    if (periodo)     query = query.eq("periodo", periodo);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const createSession = async (req, res) => {
  try {
    const {
      student_id, data_sessao, duracao_minutos, tipo_agrupamento,
      presente, objetivos, atividades, evolucao, periodo
    } = req.body;

    if (!student_id || !data_sessao) {
      return res.status(400).json({ success: false, error: "student_id e data_sessao são obrigatórios" });
    }

    const { data, error } = await supabase.from("aee_sessions").insert([{
      student_id,
      school_id:        req.schoolId,
      user_id:          req.user.id,
      data_sessao,
      duracao_minutos:  duracao_minutos || 50,
      tipo_agrupamento: tipo_agrupamento || "individual",
      presente:         presente !== undefined ? presente : true,
      objetivos:        objetivos ? sanitizeForPrompt(objetivos) : null,
      atividades:       atividades ? sanitizeForPrompt(atividades) : null,
      evolucao:         evolucao ? sanitizeForPrompt(evolucao) : null,
      periodo:          periodo || null
    }]).select().single();

    if (error) throw new Error(error.message);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { data: existing } = await supabase.from("aee_sessions")
      .select("user_id, school_id").eq("id", req.params.id).single();
    if (!existing) return res.status(404).json({ success: false, error: "Sessão não encontrada" });
    if (existing.user_id !== req.user.id && existing.school_id !== req.schoolId)
      return res.status(403).json({ success: false, error: "Acesso negado" });

    const { student_id, school_id, user_id, created_at, id, ...campos } = req.body;
    if (campos.objetivos)  campos.objetivos  = sanitizeForPrompt(campos.objetivos);
    if (campos.atividades) campos.atividades = sanitizeForPrompt(campos.atividades);
    if (campos.evolucao)   campos.evolucao   = sanitizeForPrompt(campos.evolucao);

    const { data, error } = await supabase.from("aee_sessions")
      .update(campos).eq("id", req.params.id).select().single();
    if (error) throw new Error(error.message);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteSession = async (req, res) => {
  try {
    const { data: existing } = await supabase.from("aee_sessions")
      .select("user_id, school_id").eq("id", req.params.id).single();
    if (!existing) return res.status(404).json({ success: false, error: "Sessão não encontrada" });
    if (existing.user_id !== req.user.id && existing.school_id !== req.schoolId)
      return res.status(403).json({ success: false, error: "Acesso negado" });

    const { error } = await supabase.from("aee_sessions").delete().eq("id", req.params.id);
    if (error) throw new Error(error.message);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getFrequencyPDF = async (req, res) => {
  try {
    const { student_id, periodo } = req.query;
    if (!student_id) return res.status(400).json({ success: false, error: "student_id é obrigatório" });

    let query = supabase.from("aee_sessions").select("*")
      .eq("student_id", student_id)
      .order("data_sessao", { ascending: true });
    if (periodo)      query = query.eq("periodo", periodo);
    if (req.schoolId) query = query.eq("school_id", req.schoolId);

    const { data: sessions, error } = await query;
    if (error) throw new Error(error.message);

    const { data: student } = await supabase.from("students")
      .select("full_name, grade, disability_type, school_id").eq("id", student_id).single();

    const { data: escola } = student?.school_id
      ? await supabase.from("schools")
          .select("id, name, city, state, address, phone, inep_code, cnpj, logo_url")
          .eq("id", student.school_id).single()
      : { data: null };

    await generateFrequenciaAEEPDF({ sessions: sessions || [], student, escola, periodo }, res);
  } catch (error) {
    console.error("getFrequencyPDF:", error.message);
    if (!res.headersSent) return res.status(500).json({ success: false, error: internalError(error) });
  }
};


// Relatório de Evolução AEE com IA — compila os registros das sessões do período
export const generateEvolutionReport = async (req, res) => {
  try {
    const { student_id, periodo } = req.body;
    if (!student_id) return res.status(400).json({ success: false, error: "student_id é obrigatório" });

    const { data: student } = await supabase.from("students")
      .select("id, full_name, grade, disability_type, school_id")
      .eq("id", student_id).single();
    if (!student) return res.status(404).json({ success: false, error: "Aluno não encontrado" });
    if (student.school_id && req.schoolId && student.school_id !== req.schoolId) {
      return res.status(403).json({ success: false, error: "Acesso negado: aluno de outra escola" });
    }

    let query = supabase.from("aee_sessions").select("*")
      .eq("student_id", student_id)
      .order("data_sessao", { ascending: true })
      .limit(100);
    if (periodo)      query = query.eq("periodo", periodo);
    if (req.schoolId) query = query.eq("school_id", req.schoolId);

    const { data: sessoes, error } = await query;
    if (error) throw new Error(error.message);

    if (!sessoes || sessoes.length < 2) {
      return res.status(422).json({
        success: false,
        error: "Registre pelo menos 2 sessões deste aluno no período para gerar o relatório de evolução."
      });
    }

    const result = await runNexus7Evolucao({ student, sessoes, periodo });

    // Salva no histórico de relatórios do aluno
    const { data: saved } = await supabase.from("reports").insert([{
      student_id,
      school_id: req.schoolId,
      generated_by: req.user.id,
      teacher_id: req.user.id,
      report_type: "evolucao_aee",
      period: periodo || null,
      content: result
    }]).select("id").single();

    return res.json({ success: true, reportId: saved?.id || null, data: result });
  } catch (error) {
    console.error("generateEvolutionReport:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
