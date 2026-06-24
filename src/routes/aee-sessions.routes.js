import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listSessions, createSession, updateSession, deleteSession, getFrequencyPDF
} from "../controllers/aee-sessions.controller.js";

const router = express.Router();

// frequency-pdf ANTES de /:id para evitar colisão de parâmetro
router.get("/aee-sessions/frequency-pdf", authMiddleware, getFrequencyPDF);
router.get("/aee-sessions",               authMiddleware, listSessions);
router.post("/aee-sessions",              authMiddleware, createSession);
router.put("/aee-sessions/:id",           authMiddleware, updateSession);
router.delete("/aee-sessions/:id",        authMiddleware, deleteSession);

export default router;
