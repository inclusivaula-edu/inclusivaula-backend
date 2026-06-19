import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} from "../services/teacher.service.js";
import { internalError } from "../utils/sanitize.js";

export const createTeacherController = async (req, res) => {
  try {
    const teacher = await createTeacher(req.body, req.schoolId);
    return res.status(201).json({ success: true, data: teacher });
  } catch (error) {
    console.error("createTeacher:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getTeachersController = async (req, res) => {
  try {
    const teachers = await getTeachers(req.schoolId);
    return res.json({ success: true, data: teachers });
  } catch (error) {
    console.error("getTeachers:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getTeacherByIdController = async (req, res) => {
  try {
    const teacher = await getTeacherById(req.params.id, req.schoolId);
    if (!teacher) return res.status(404).json({ success: false, error: "Professor não encontrado" });
    return res.json({ success: true, data: teacher });
  } catch (error) {
    console.error("getTeacherById:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const updateTeacherController = async (req, res) => {
  try {
    const teacher = await updateTeacher(req.params.id, req.body, req.schoolId);
    return res.json({ success: true, data: teacher });
  } catch (error) {
    console.error("updateTeacher:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteTeacherController = async (req, res) => {
  try {
    await deleteTeacher(req.params.id, req.schoolId);
    return res.json({ success: true, message: "Professor removido com sucesso" });
  } catch (error) {
    console.error("deleteTeacher:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
