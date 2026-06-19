import {
  createEnrollment,
  getEnrollments,
  getEnrollmentById,
  deleteEnrollment
} from "../services/enrollment.service.js";
import { internalError } from "../utils/sanitize.js";

export const createEnrollmentController = async (req, res) => {
  try {
    const enrollment = await createEnrollment(req.body, req.schoolId);
    return res.status(201).json({ success: true, data: enrollment });
  } catch (error) {
    console.error("createEnrollment:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getEnrollmentsController = async (req, res) => {
  try {
    const enrollments = await getEnrollments(req.schoolId);
    return res.json({ success: true, data: enrollments });
  } catch (error) {
    console.error("getEnrollments:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getEnrollmentByIdController = async (req, res) => {
  try {
    const enrollment = await getEnrollmentById(req.params.id, req.schoolId);
    if (!enrollment) return res.status(404).json({ success: false, error: "Matrícula não encontrada" });
    return res.json({ success: true, data: enrollment });
  } catch (error) {
    console.error("getEnrollmentById:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteEnrollmentController = async (req, res) => {
  try {
    await deleteEnrollment(req.params.id, req.schoolId);
    return res.json({ success: true, message: "Matrícula removida com sucesso" });
  } catch (error) {
    console.error("deleteEnrollment:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
