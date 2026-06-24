import express from "express";

import {
  generateLesson,
  getLessonStatus,
  getLessonPDF,
  indexApprovedLesson
} from "../controllers/lesson.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";

const router = express.Router();

// 🔐 gerar aula (IA pesada)
router.post(
  "/generate-lesson",
  authMiddleware,
  secureMiddleware,
  generateLesson
);

// 🔐 status do job
router.get(
  "/lesson-status/:jobId",
  authMiddleware,
  secureMiddleware,
  getLessonStatus
);

// 🔐 PDF da aula
router.get(
  "/lesson-pdf/:jobId",
  authMiddleware,
  secureMiddleware,
  getLessonPDF
);

// 🔐 indexar aula aprovada no RAG + memória
router.post(
  "/lessons/:id/index-approved",
  authMiddleware,
  indexApprovedLesson
);

export default router;