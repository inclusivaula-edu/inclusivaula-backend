import { generateStudentReport } from "../services/report.service.js";

// ✅ gerar relatório
export const generateReportController = async (req, res) => {
  try {

    const report = await generateStudentReport(
      req.params.studentId
    );

    return res.json({
      success: true,
      data: report
    });

  } catch (error) {

    console.error("❌ generateReport:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};