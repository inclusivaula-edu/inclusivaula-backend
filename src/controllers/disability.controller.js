import {
  createDisability,
  getDisabilities,
  getDisabilityById,
  updateDisability,
  deleteDisability
} from "../services/disability.service.js";

// ✅ criar
export const createDisabilityController = async (req, res) => {
  try {

    const disability = await createDisability(req.body);

    return res.status(201).json({
      success: true,
      data: disability
    });

  } catch (error) {

    console.error("❌ createDisability:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ listar
export const getDisabilitiesController = async (req, res) => {
  try {

    const disabilities = await getDisabilities();

    return res.json({
      success: true,
      data: disabilities
    });

  } catch (error) {

    console.error("❌ getDisabilities:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ buscar por id
export const getDisabilityByIdController = async (req, res) => {
  try {

    const disability = await getDisabilityById(req.params.id);

    return res.json({
      success: true,
      data: disability
    });

  } catch (error) {

    console.error("❌ getDisabilityById:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ atualizar
export const updateDisabilityController = async (req, res) => {
  try {

    const disability = await updateDisability(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      data: disability
    });

  } catch (error) {

    console.error("❌ updateDisability:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ deletar
export const deleteDisabilityController = async (req, res) => {
  try {

    await deleteDisability(req.params.id);

    return res.json({
      success: true,
      message: "Registro removido com sucesso"
    });

  } catch (error) {

    console.error("❌ deleteDisability:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};