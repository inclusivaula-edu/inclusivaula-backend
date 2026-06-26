import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";
import {
  listSessions, createSession, updateSession, deleteSession, getFrequencyPDF
} from "../controllers/aee-sessions.controller.js";

const router = express.Router();

router.get("/aee-sessions/frequency-pdf", authMiddleware, getFrequencyPDF);
router.get("/aee-sessions",               authMiddleware, listSessions);
router.post("/aee-sessions",              authMiddleware, createSession);
router.put("/aee-sessions/:id",           authMiddleware, tenantGuard("aee_session"), updateSession);
router.delete("/aee-sessions/:id",        authMiddleware, tenantGuard("aee_session"), deleteSession);

export default router;
