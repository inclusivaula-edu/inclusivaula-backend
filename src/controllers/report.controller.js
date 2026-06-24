import { generateStudentReport } from "../services/report.service.js";
import { generateStudentReportPDF, generatePAEEPDF } from "../services/pdf.service.js";
import { getPlano, getUsoMensal } from "../services/usage.service.js";
import { internalError } from "../utils/sanitize.js";

const CARGOS_ADMIN = ["coordenador_municipal","coordenador_estadual","secretario_municipal","secretario_estadual","diretor","coordenador"];

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

    // Admins acessam relatórios de qualquer escola; professores só da própria escola
    const isAdmin = CARGOS_ADMIN.includes(req.cargo);
    let query = supabase.from("reports").select("*").eq("id", req.params.reportId);
    if (!isAdmin && req.schoolId) query = query.eq("school_id", req.schoolId);

    const { data: report, error } = await query.single();
    if (error || !report) {
      return res.status(404).json({ success: false, error: "Relatório não encontrado" });
    }

    const { data: student } = await supabase
      .from("students").select("*").eq("id", report.student_id).single();

    const { data: escola } = student?.school_id
      ? await supabase.from("schools").select("id, name, city, state, address, phone, inep_code, cnpj, logo_url").eq("id", student.school_id).single()
      : { data: null };

    const rep = report.content?.report || report.content;

    // PAEE usa PDF especializado com estrutura do plano AEE
    if (report.report_type === "paee") {
      await generatePAEEPDF({ result: rep, student, escola, periodo: report.period }, res);
      return;
    }

    await generateStudentReportPDF({
      report: rep,
      metrics: report.content?.metrics || {},
      student,
      escola
    }, res);
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