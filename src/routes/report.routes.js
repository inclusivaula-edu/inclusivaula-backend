import express from "express";
import {
  generateReportController,
  getReportsByStudent,
  generateReportPDFController
} from "../controllers/report.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";

const router = express.Router();

router.post("/reports/generate", authMiddleware, secureMiddleware, generateReportController);
router.get("/reports/student/:studentId", authMiddleware, secureMiddleware, getReportsByStudent);
router.get("/reports/:reportId/pdf", authMiddleware, secureMiddleware, generateReportPDFController);

export default router;