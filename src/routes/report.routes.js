import express from "express";
import {
  generateReportController,
  getReportsByStudent,
  generateReportPDFController
} from "../controllers/report.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";

const router = express.Router();

// Gera relatório com IA (POST com body: studentId, tipo, periodo)
router.post(
  "/reports/generate",
  authMiddleware,
  secureMiddleware,
  generateReportController
);

// Lista relatórios já gerados de um aluno
router.get(
  "/reports/student/:studentId",
  authMiddleware,
  secureMiddleware,
  getReportsByStudent
);

// Gera PDF do relatório (GET com query: tipo, periodo)
router.get(
  "/reports/student/:studentId/pdf",
  authMiddleware,
  secureMiddleware,
  generateReportPDFController
);

export default router;