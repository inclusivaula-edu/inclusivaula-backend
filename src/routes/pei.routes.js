import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  generatePEI, getPEIStatus, listPEIs,
  generateAEE, getAEEStatus, listAEEs
} from "../controllers/pei.controller.js";

const router = Router();

router.use(authMiddleware);

// PEI — Plano Educacional Individualizado (Lei 13.146/2015)
router.post("/pei/generate", generatePEI);
router.get("/pei/:jobId/status", getPEIStatus);
router.get("/pei", listPEIs);

// AEE — Atendimento Educacional Especializado (Decreto 7.611/2011)
router.post("/aee/generate", generateAEE);
router.get("/aee/:jobId/status", getAEEStatus);
router.get("/aee", listAEEs);

export default router;
