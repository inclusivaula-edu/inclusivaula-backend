import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass
} from "../services/class.service.js";
import { internalError } from "../utils/sanitize.js";

export const createClassController = async (req, res) => {
  try {
    const newClass = await createClass(req.body, req.schoolId);
    return res.status(201).json({ success: true, data: newClass });
  } catch (error) {
    console.error("createClass:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getClassesController = async (req, res) => {
  try {
    const classes = await getClasses(req.schoolId);
    return res.json({ success: true, data: classes });
  } catch (error) {
    console.error("getClasses:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getClassByIdController = async (req, res) => {
  try {
    const classItem = await getClassById(req.params.id, req.schoolId);
    if (!classItem) return res.status(404).json({ success: false, error: "Turma não encontrada" });
    return res.json({ success: true, data: classItem });
  } catch (error) {
    console.error("getClassById:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const updateClassController = async (req, res) => {
  try {
    const updatedClass = await updateClass(req.params.id, req.body, req.schoolId);
    return res.json({ success: true, data: updatedClass });
  } catch (error) {
    console.error("updateClass:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteClassController = async (req, res) => {
  try {
    await deleteClass(req.params.id, req.schoolId);
    return res.json({ success: true, message: "Turma removida com sucesso" });
  } catch (error) {
    console.error("deleteClass:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
