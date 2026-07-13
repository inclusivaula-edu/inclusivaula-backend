import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireAEE } from "../middlewares/aee.middleware.js";
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

// PAEE — Atendimento Educacional Especializado (Decreto 7.611/2011)
// Restrito a profissionais de AEE e gestão
router.post("/aee/generate", requireAEE, generateAEE);
router.get("/aee/:jobId/status", requireAEE, getAEEStatus);
router.get("/aee", requireAEE, listAEEs);
router.post("/aee/:id/approve", requireAEE, approveAEE);
router.get("/aee/:id/pdf", requireAEE, getAEEPDF);

// PDI — Plano de Desenvolvimento Individual (mesma tabela/fluxo do PEI)
router.post("/pdi/generate", generatePDI);

// Estudo de Caso — porta de entrada do AEE (Portaria MEC 421/2026)
// Restrito a profissionais de AEE e gestão
router.post("/estudo-caso/generate", requireAEE, generateCaseStudy);
router.get("/estudo-caso/:jobId/status", requireAEE, getCaseStudyStatus);
router.get("/estudo-caso", requireAEE, listCaseStudies);
router.get("/estudo-caso/:id/pdf", requireAEE, getCaseStudyPDF);

export default router;
