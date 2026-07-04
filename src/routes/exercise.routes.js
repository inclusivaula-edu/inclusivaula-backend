import express from "express";
import {
  generateExercises,
  getExercisesByLesson,
  registerGrade,
  generateRubrica,
  deleteAvaliacao,
  getAvaliacaoPDF
} from "../controllers/exercise.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";

const router = express.Router();

router.post("/exercises/generate", authMiddleware, secureMiddleware, generateExercises);
router.get("/exercises/lesson/:lessonId", authMiddleware, secureMiddleware, getExercisesByLesson);
router.post("/exercises/grade", authMiddleware, secureMiddleware, registerGrade);
router.post("/exercises/rubrica", authMiddleware, secureMiddleware, generateRubrica);
router.get("/exercises/:id/pdf", authMiddleware, secureMiddleware, getAvaliacaoPDF);
router.delete("/exercises/:id", authMiddleware, secureMiddleware, deleteAvaliacao);

export default router;