import express from "express";

import {
  generateReportController
} from "../controllers/report.controller.js";

const router = express.Router();

// ✅ gerar relatório IA
router.get(
  "/reports/student/:studentId",
  generateReportController
);

export default router;