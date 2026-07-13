import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";
import { requireAEE } from "../middlewares/aee.middleware.js";
import {
  listSessions, createSession, updateSession, deleteSession, getFrequencyPDF, generateEvolutionReport
} from "../controllers/aee-sessions.controller.js";

const router = express.Router();

// Restrito a profissionais de AEE e gestão
router.get("/aee-sessions/frequency-pdf", authMiddleware, requireAEE, getFrequencyPDF);
router.post("/aee-sessions/evolution-report", authMiddleware, requireAEE, generateEvolutionReport);
router.get("/aee-sessions",               authMiddleware, requireAEE, listSessions);
router.post("/aee-sessions",              authMiddleware, requireAEE, createSession);
router.put("/aee-sessions/:id",           authMiddleware, requireAEE, tenantGuard("aee_session"), updateSession);
router.delete("/aee-sessions/:id",        authMiddleware, requireAEE, tenantGuard("aee_session"), deleteSession);

export default router;
