import {
  generateStudentReport
} from "../services/report.service.js";

import {
  generateStudentReportPDF
} from "../services/pdf.service.js";

// ✅ gerar relatório JSON
export const generateReportController = async (
  req,
  res
) => {

  try {

    const report =
      await generateStudentReport(
        req.params.studentId
      );

    return res.json({
      success: true,
      data: report
    });

  } catch (error) {

    console.error(
      "❌ generateReport:",
      error.message
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ gerar PDF
export const generateReportPDFController =
async (req, res) => {

  try {

    const report =
      await generateStudentReport(
        req.params.studentId
      );

    // 🔥 validação
    if (!report?.student) {

      return res.status(404).json({
        success: false,
        error: "Aluno não encontrado"
      });
    }

    await generateStudentReportPDF(
      report,
      res
    );

  } catch (error) {

    console.error(
      "❌ generateReportPDF:",
      error.message
    );

    // 🔥 evita erro stream encerrada
    if (!res.headersSent) {

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};