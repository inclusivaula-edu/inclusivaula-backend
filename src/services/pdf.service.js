import PDFDocument from "pdfkit";

export const generateStudentReportPDF = async (
  reportData,
  res
) => {

  const doc = new PDFDocument({
    margin: 50
  });

  // 🔥 headers
  res.setHeader(
    "Content-Type",
    "application/pdf"
  );

  res.setHeader(
    "Content-Disposition",
    "inline; filename=relatorio.pdf"
  );

  doc.pipe(res);

  // =========================
  // 🏫 TÍTULO
  // =========================

  doc
    .fontSize(24)
    .text("InclusivAula", {
      align: "center"
    });

  doc.moveDown();

  doc
    .fontSize(18)
    .text("Relatório Pedagógico IA", {
      align: "center"
    });

  doc.moveDown(2);

  // =========================
  // 👨‍🎓 ALUNO
  // =========================

  doc
    .fontSize(14)
    .text(`Aluno: ${reportData.student.name}`);

  doc.text(
    `Média Geral: ${reportData.averageScore}`
  );

  doc.text(
    `Frequência: ${reportData.attendanceRate}%`
  );

  doc.moveDown();

  // =========================
  // 🧠 PARECER IA
  // =========================

  doc
    .fontSize(16)
    .text("Parecer Pedagógico");

  doc.moveDown();

  doc
    .fontSize(12)
    .text(reportData.report, {
      align: "justify"
    });

  doc.moveDown(2);

  // =========================
  // 📅 RODAPÉ
  // =========================

  doc
    .fontSize(10)
    .text(
      `Gerado automaticamente pela InclusivAula em ${new Date().toLocaleDateString()}`,
      {
        align: "center"
      }
    );

  doc.end();
};