import { generateStudentReport } from "../services/report.service.js";
import { generateStudentReportPDF } from "../services/pdf.service.js";

// Gera relatório com IA por tipo — semestral, familia, aee ou pei
export const generateReportController = async (req, res) => {
  try {
    const { studentId, tipo, periodo } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: "studentId é obrigatório"
      });
    }

    const result = await generateStudentReport(
      studentId,
      tipo || "semestral",
      periodo || null
    );

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
    const result = await generateStudentReport(
      req.params.studentId,
      req.query.tipo || "semestral",
      req.query.periodo || null
    );

    if (!result?.student) {
      return res.status(404).json({
        success: false,
        error: "Aluno não encontrado"
      });
    }

    await generateStudentReportPDF(result, res);

  } catch (error) {
    console.error("❌ generateReportPDF:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};