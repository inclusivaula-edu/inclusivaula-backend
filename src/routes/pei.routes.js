import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  generatePEI, getPEIStatus, listPEIs, approvePEI, getPEIPDF,
  generateAEE, getAEEStatus, listAEEs, approveAEE, getAEEPDF
} from "../controllers/pei.controller.js";

const router = Router();

router.use(authMiddleware);

// PEI — Plano Educacional Individualizado (Lei 13.146/2015)
router.post("/pei/generate", generatePEI);
router.get("/pei/:jobId/status", getPEIStatus);
router.get("/pei", listPEIs);
router.post("/pei/:id/approve", approvePEI);
router.get("/pei/:id/pdf", getPEIPDF);

// AEE — Atendimento Educacional Especializado (Decreto 7.611/2011)
router.post("/aee/generate", generateAEE);
router.get("/aee/:jobId/status", getAEEStatus);
router.get("/aee", listAEEs);
router.post("/aee/:id/approve", approveAEE);
router.get("/aee/:id/pdf", getAEEPDF);

export default router;
