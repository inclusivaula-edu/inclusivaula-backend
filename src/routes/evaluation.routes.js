import express from "express";
import {
  createEvaluationController,
  getEvaluationsController,
  getEvaluationByIdController,
  updateEvaluationController,
  deleteEvaluationController
} from "../controllers/evaluation.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/evaluations", authMiddleware, createEvaluationController);
router.get("/evaluations", authMiddleware, getEvaluationsController);
router.get("/evaluations/:id", authMiddleware, getEvaluationByIdController);
router.put("/evaluations/:id", authMiddleware, updateEvaluationController);
router.delete("/evaluations/:id", authMiddleware, deleteEvaluationController);

export default router;
