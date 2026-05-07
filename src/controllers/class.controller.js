import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass
} from "../services/class.service.js";

// ✅ criar turma
export const createClassController = async (req, res) => {
  try {

    const newClass = await createClass(req.body);

    return res.status(201).json({
      success: true,
      data: newClass
    });

  } catch (error) {

    console.error("❌ createClass:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ listar turmas
export const getClassesController = async (req, res) => {
  try {

    const classes = await getClasses();

    return res.json({
      success: true,
      data: classes
    });

  } catch (error) {

    console.error("❌ getClasses:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ buscar por id
export const getClassByIdController = async (req, res) => {
  try {

    const classItem = await getClassById(req.params.id);

    return res.json({
      success: true,
      data: classItem
    });

  } catch (error) {

    console.error("❌ getClassById:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ atualizar
export const updateClassController = async (req, res) => {
  try {

    const updatedClass = await updateClass(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      data: updatedClass
    });

  } catch (error) {

    console.error("❌ updateClass:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ deletar
export const deleteClassController = async (req, res) => {
  try {

    await deleteClass(req.params.id);

    return res.json({
      success: true,
      message: "Turma removida com sucesso"
    });

  } catch (error) {

    console.error("❌ deleteClass:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};