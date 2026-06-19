import {
  createAttendance,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance
} from "../services/attendance.service.js";
import { internalError } from "../utils/sanitize.js";

export const createAttendanceController = async (req, res) => {
  try {
    const attendance = await createAttendance(req.body, req.schoolId);
    return res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    console.error("createAttendance:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getAttendanceController = async (req, res) => {
  try {
    const attendance = await getAttendance(req.schoolId);
    return res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("getAttendance:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const getAttendanceByIdController = async (req, res) => {
  try {
    const attendance = await getAttendanceById(req.params.id, req.schoolId);
    if (!attendance) return res.status(404).json({ success: false, error: "Frequência não encontrada" });
    return res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("getAttendanceById:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const updateAttendanceController = async (req, res) => {
  try {
    const attendance = await updateAttendance(req.params.id, req.body, req.schoolId);
    return res.json({ success: true, data: attendance });
  } catch (error) {
    console.error("updateAttendance:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const deleteAttendanceController = async (req, res) => {
  try {
    await deleteAttendance(req.params.id, req.schoolId);
    return res.json({ success: true, message: "Frequência removida com sucesso" });
  } catch (error) {
    console.error("deleteAttendance:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
