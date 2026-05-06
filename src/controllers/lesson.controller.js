import {
  createLessonJob,
  getJob,
  generatePDF
} from "../services/lesson.service.js";

export const generateLesson = async (req, res) => {
  try {

    // 👤 usuário autenticado
    const user = req.user;

    console.log("📚 Gerando aula para:", user.email);

    // 🔥 envia dados + usuário
    const job = await createLessonJob({
      ...req.body,
      user_id: user.id,
      user_email: user.email
    });

    return res.json({
      success: true,
      message: "Aula enviada para processamento",
      jobId: job.id
    });

  } catch (error) {

    console.error("❌ ERRO generateLesson:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getLessonStatus = async (req, res) => {
  try {

    const job = await getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job não encontrado"
      });
    }

    return res.json({
      success: true,
      status: job.status,
      data: job.result
    });

  } catch (error) {

    console.error("❌ ERRO getLessonStatus:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getLessonPDF = async (req, res) => {
  try {

    const pdf = await generatePDF(req.params.jobId);

    res.setHeader("Content-Type", "text/plain");

    return res.send(pdf);

  } catch (error) {

    console.error("❌ ERRO getLessonPDF:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};