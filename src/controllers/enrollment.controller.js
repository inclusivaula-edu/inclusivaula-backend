import {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  deleteEnrollment
} from "../services/enrollment.service.js";

// ✅ criar matrícula
export const createEnrollmentController = async (req, res) => {
  try {

    const enrollment = await createEnrollment(req.body);

    return res.status(201).json({
      success: true,
      data: enrollment
    });

  } catch (error) {

    console.error("❌ createEnrollment:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ listar matrículas
export const getEnrollmentsController = async (req, res) => {
  try {

    const enrollments = await getEnrollments();

    return res.json({
      success: true,
      data: enrollments
    });

  } catch (error) {

    console.error("❌ getEnrollments:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ buscar matrícula por id
export const getEnrollmentByIdController = async (req, res) => {
  try {

    const enrollment = await getEnrollmentById(req.params.id);

    return res.json({
      success: true,
      data: enrollment
    });

  } catch (error) {

    console.error("❌ getEnrollmentById:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ deletar matrícula
export const deleteEnrollmentController = async (req, res) => {
  try {

    await deleteEnrollment(req.params.id);

    return res.json({
      success: true,
      message: "Matrícula removida com sucesso"
    });

  } catch (error) {

    console.error("❌ deleteEnrollment:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};