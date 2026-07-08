import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  generatePEI, getPEIStatus, listPEIs, approvePEI, getPEIPDF,
  generateAEE, getAEEStatus, listAEEs, approveAEE, getAEEPDF,
  generatePDI
} from "../controllers/pei.controller.js";
import {
  generateCaseStudy, getCaseStudyStatus, listCaseStudies, getCaseStudyPDF
} from "../controllers/casestudy.controller.js";

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

// PDI — Plano de Desenvolvimento Individual (mesma tabela/fluxo do PEI)
router.post("/pdi/generate", generatePDI);

// Estudo de Caso — porta de entrada do AEE (Portaria MEC 421/2026)
router.post("/estudo-caso/generate", generateCaseStudy);
router.get("/estudo-caso/:jobId/status", getCaseStudyStatus);
router.get("/estudo-caso", listCaseStudies);
router.get("/estudo-caso/:id/pdf", getCaseStudyPDF);

export default router;
