import { generateStudentReport } from "../services/report.service.js";
import { generateStudentReportPDF } from "../services/pdf.service.js";

// Gera relatório com IA por tipo — semestral, familia, aee, pei ou paee
export const generateReportController = async (req, res) => {
  try {
    const { studentId, tipo, periodo } = req.body;
    if (!studentId) return res.status(400).json({ success: false, error: "studentId é obrigatório" });

    const result = await generateStudentReport(studentId, tipo || "semestral", periodo || null);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("❌ generateReport:", error.message);
    return res.status(500).json({ success: false, error: error.message });
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
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Gera PDF do relatório
export const generateReportPDFController = async (req, res) => {
  try {
    const { supabase } = await import("../config/supabase.js");
    const { data: report, error } = await supabase
      .from("reports")
      .select("*")
      .eq("id", req.params.reportId)
      .single();

    if (error || !report) {
      return res.status(404).json({ success: false, error: "Relatório não encontrado" });
    }

    // Busca dados completos do aluno
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("id", report.student_id)
      .single();

    const reportData = {
      report: report.content?.report || report.content,
      metrics: report.content?.metrics || {},
      student
    };

    await generateStudentReportPDF(reportData, res);
  } catch (error) {
    console.error("❌ generateReportPDF:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};