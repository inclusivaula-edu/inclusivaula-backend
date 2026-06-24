import { generateStudentReport } from "../services/report.service.js";
import { generateStudentReportPDF } from "../services/pdf.service.js";
import { getPlano, getUsoMensal } from "../services/usage.service.js";
import { internalError } from "../utils/sanitize.js";

// Gera relatório com IA por tipo — semestral, familia, aee, pei ou paee
export const generateReportController = async (req, res) => {
  try {
    const { studentId, tipo, periodo } = req.body;
    const userId = req.user?.id || null;

    if (!studentId) return res.status(400).json({ success: false, error: "studentId é obrigatório" });

    // Passa userId para o service verificar o limite
    const result = await generateStudentReport(
      studentId,
      tipo || "semestral",
      periodo || null,
      userId
    );

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ generateReport:", error.message);
    // Retorna 403 se for erro de limite
    const status = error.message.includes("Limite") ? 403 : 500;
    return res.status(status).json({ success: false, error: internalError(error) });
  }
};

// Lista relatórios já gerados de um aluno
export const getReportsByStudent = async (req, res) => {
  try {
    const { supabase } = await import("../config/supabase.js");
    const { data, error } = await supabase
      .from("reports")
      .select("id, report_type, period, created_at, aprovado")
      .eq("student_id", req.params.studentId)
      .eq("school_id", req.schoolId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

// Gera PDF do relatório
export const generateReportPDFController = async (req, res) => {
  try {
    const { supabase } = await import("../config/supabase.js");
    const { data: report, error } = await supabase
      .from("reports").select("*").eq("id", req.params.reportId).eq("school_id", req.schoolId).single();

    if (error || !report) {
      return res.status(404).json({ success: false, error: "Relatório não encontrado" });
    }

    const { data: student } = await supabase
      .from("students").select("*").eq("id", report.student_id).single();

    const { data: escola } = student?.school_id
      ? await supabase.from("schools").select("id, name, city, state, address, phone, inep_code, cnpj, logo_url").eq("id", student.school_id).single()
      : { data: null };

    const reportData = {
      report: report.content?.report || report.content,
      metrics: report.content?.metrics || {},
      student,
      escola
    };

    await generateStudentReportPDF(reportData, res);
  } catch (error) {
    console.error("❌ generateReportPDF:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: internalError(error) });
    }
  }
};

// Retorna o uso e plano atual do professor logado
export const getUsageController = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: "Não autenticado" });

    const mes = new Date().toISOString().slice(0, 7);
    const [plano, uso] = await Promise.all([
      getPlano(userId),
      getUsoMensal(userId, null)
    ]);

    return res.json({
      success: true,
      data: {
        plano: plano.plan,
        aulas: { usadas: uso?.aulas_geradas || 0, limite: plano.aulas_limite },
        relatorios: { usados: uso?.relatorios_gerados || 0, limite: plano.relatorios_limite },
        mes
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};