import express from "express";

import {
  generateReportController,
  generateReportPDFController
} from "../controllers/report.controller.js";

const router = express.Router();

// ✅ gerar relatório IA JSON
router.get(
  "/reports/student/:studentId",
  generateReportController
);

// ✅ gerar PDF relatório
router.get(
  "/reports/student/:studentId/pdf",
  generateReportPDFController
);

export default router;