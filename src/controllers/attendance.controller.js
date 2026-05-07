import {
  createAttendance,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  deleteAttendance
} from "../services/attendance.service.js";

// ✅ criar
export const createAttendanceController = async (req, res) => {
  try {

    const attendance = await createAttendance(req.body);

    return res.status(201).json({
      success: true,
      data: attendance
    });

  } catch (error) {

    console.error("❌ createAttendance:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ listar
export const getAttendanceController = async (req, res) => {
  try {

    const attendance = await getAttendance();

    return res.json({
      success: true,
      data: attendance
    });

  } catch (error) {

    console.error("❌ getAttendance:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ buscar por id
export const getAttendanceByIdController = async (req, res) => {
  try {

    const attendance = await getAttendanceById(req.params.id);

    return res.json({
      success: true,
      data: attendance
    });

  } catch (error) {

    console.error("❌ getAttendanceById:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ atualizar
export const updateAttendanceController = async (req, res) => {
  try {

    const attendance = await updateAttendance(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      data: attendance
    });

  } catch (error) {

    console.error("❌ updateAttendance:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ deletar
export const deleteAttendanceController = async (req, res) => {
  try {

    await deleteAttendance(req.params.id);

    return res.json({
      success: true,
      message: "Frequência removida com sucesso"
    });

  } catch (error) {

    console.error("❌ deleteAttendance:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};