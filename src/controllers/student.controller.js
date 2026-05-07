import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent
} from "../services/student.service.js";

// ✅ criar
export const createStudentController = async (req, res) => {
  try {

    const student = await createStudent(req.body);

    return res.status(201).json({
      success: true,
      data: student
    });

  } catch (error) {

    console.error("❌ createStudent:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ listar
export const getStudentsController = async (req, res) => {
  try {

    const students = await getStudents();

    return res.json({
      success: true,
      data: students
    });

  } catch (error) {

    console.error("❌ getStudents:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ buscar por id
export const getStudentByIdController = async (req, res) => {
  try {

    const student = await getStudentById(req.params.id);

    return res.json({
      success: true,
      data: student
    });

  } catch (error) {

    console.error("❌ getStudentById:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ atualizar
export const updateStudentController = async (req, res) => {
  try {

    const student = await updateStudent(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      data: student
    });

  } catch (error) {

    console.error("❌ updateStudent:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ deletar
export const deleteStudentController = async (req, res) => {
  try {

    await deleteStudent(req.params.id);

    return res.json({
      success: true,
      message: "Aluno removido com sucesso"
    });

  } catch (error) {

    console.error("❌ deleteStudent:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};