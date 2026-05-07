import {
  createEvaluation,
  getEvaluations,
  getEvaluationById,
  updateEvaluation,
  deleteEvaluation
} from "../services/evaluation.service.js";

// ✅ criar
export const createEvaluationController = async (req, res) => {
  try {

    const evaluation = await createEvaluation(req.body);

    return res.status(201).json({
      success: true,
      data: evaluation
    });

  } catch (error) {

    console.error("❌ createEvaluation:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ listar
export const getEvaluationsController = async (req, res) => {
  try {

    const evaluations = await getEvaluations();

    return res.json({
      success: true,
      data: evaluations
    });

  } catch (error) {

    console.error("❌ getEvaluations:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ buscar por id
export const getEvaluationByIdController = async (req, res) => {
  try {

    const evaluation = await getEvaluationById(req.params.id);

    return res.json({
      success: true,
      data: evaluation
    });

  } catch (error) {

    console.error("❌ getEvaluationById:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ atualizar
export const updateEvaluationController = async (req, res) => {
  try {

    const evaluation = await updateEvaluation(
      req.params.id,
      req.body
    );

    return res.json({
      success: true,
      data: evaluation
    });

  } catch (error) {

    console.error("❌ updateEvaluation:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ✅ deletar
export const deleteEvaluationController = async (req, res) => {
  try {

    await deleteEvaluation(req.params.id);

    return res.json({
      success: true,
      message: "Avaliação removida com sucesso"
    });

  } catch (error) {

    console.error("❌ deleteEvaluation:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};