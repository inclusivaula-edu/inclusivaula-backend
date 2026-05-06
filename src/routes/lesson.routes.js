import express from "express";

import {
  generateLesson,
  getLessonStatus,
  getLessonPDF
} from "../controllers/lesson.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 🔐 rotas protegidas
router.post(
  "/generate-lesson",
  authMiddleware,
  generateLesson
);

router.get(
  "/lesson-status/:jobId",
  authMiddleware,
  getLessonStatus
);

router.get(
  "/lesson-pdf/:jobId",
  authMiddleware,
  getLessonPDF
);

export default router;