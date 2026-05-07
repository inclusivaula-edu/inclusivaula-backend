import {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
} from "../services/teacher.service.js";

// ✅ criar
export const createTeacherController = async (req, res) => {
  try {

    const teacher = await createTeacher(req.body);

    return res.status(201).json({
      success: true,
      data: teacher
    });

  } catch (error) {

    console.error("❌ createTeacher:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ listar
export const getTeachersController = async (req, res) => {
  try {

    const teachers = await getTeachers();

    return res.json({
      success: true,
      data: teachers
    });

  } catch (error) {

    console.error("❌ getTeachers:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ buscar por id
export const getTeacherByIdController = async (req, res) => {
  try {

    const teacher = await getTeacherById(req.params.id);

    return res.json({
      success: true,
      data: teacher
    });

  } catch (error) {

    console.error("❌ getTeacherById:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ atualizar
export const updateTeacherController = async (req, res) => {
  try {

    const teacher = await updateTeacher(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      data: teacher
    });

  } catch (error) {

    console.error("❌ updateTeacher:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ deletar
export const deleteTeacherController = async (req, res) => {
  try {

    await deleteTeacher(req.params.id);

    return res.json({
      success: true,
      message: "Professor removido com sucesso"
    });

  } catch (error) {

    console.error("❌ deleteTeacher:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};