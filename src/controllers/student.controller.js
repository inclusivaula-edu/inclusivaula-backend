import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} from "../services/student.service.js";
import { internalError } from "../utils/sanitize.js";

export const createStudentController = async (req, res) => {
  try {
    const student = await createStudent(req.body, req.schoolId, req.user?.id);
    return res.status(201).json({ success: true, data: student });
  } catch (error) {
    console.error("createStudent:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getStudentsController = async (req, res) => {
  try {
    const students = await getStudents(req.schoolId, { userId: req.user?.id, role: req.role });
    return res.json({ success: true, data: students });
  } catch (error) {
    console.error("getStudents:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getStudentByIdController = async (req, res) => {
  try {
    const student = await getStudentById(req.params.id, req.schoolId);
    if (!student) return res.status(404).json({ success: false, error: "Aluno não encontrado" });
    return res.json({ success: true, data: student });
  } catch (error) {
    console.error("getStudentById:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const updateStudentController = async (req, res) => {
  try {
    const student = await updateStudent(req.params.id, req.body, req.schoolId);
    return res.json({ success: true, data: student });
  } catch (error) {
    console.error("updateStudent:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteStudentController = async (req, res) => {
  try {
    await deleteStudent(req.params.id, req.schoolId);
    return res.json({ success: true, message: "Aluno removido com sucesso" });
  } catch (error) {
    console.error("deleteStudent:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
