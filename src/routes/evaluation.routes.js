import express from "express";

import {
  createEvaluationController,
  getEvaluationsController,
  getEvaluationByIdController,
  updateEvaluationController,
  deleteEvaluationController
} from "../controllers/evaluation.controller.js";

const router = express.Router();

// ✅ criar
router.post(
  "/evaluations",
  createEvaluationController
);

// ✅ listar
router.get(
  "/evaluations",
  getEvaluationsController
);

// ✅ buscar por id
router.get(
  "/evaluations/:id",
  getEvaluationByIdController
);

// ✅ atualizar
router.put(
  "/evaluations/:id",
  updateEvaluationController
);

// ✅ deletar
router.delete(
  "/evaluations/:id",
  deleteEvaluationController
);

export default router;