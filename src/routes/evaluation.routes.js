import express from "express";
import {
  createEvaluationController,
  getEvaluationsController,
  getEvaluationByIdController,
  updateEvaluationController,
  deleteEvaluationController
} from "../controllers/evaluation.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";

const router = express.Router();

router.post("/evaluations", authMiddleware, createEvaluationController);
router.get("/evaluations", authMiddleware, getEvaluationsController);
router.get("/evaluations/:id", authMiddleware, tenantGuard("evaluation"), getEvaluationByIdController);
router.put("/evaluations/:id", authMiddleware, tenantGuard("evaluation"), updateEvaluationController);
router.delete("/evaluations/:id", authMiddleware, tenantGuard("evaluation"), deleteEvaluationController);

export default router;
