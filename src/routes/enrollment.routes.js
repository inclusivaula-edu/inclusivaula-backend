import express from "express";
import {
  createEnrollmentController,
  getEnrollmentsController,
  getEnrollmentByIdController,
  deleteEnrollmentController
} from "../controllers/enrollment.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/enrollments", authMiddleware, createEnrollmentController);
router.get("/enrollments", authMiddleware, getEnrollmentsController);
router.get("/enrollments/:id", authMiddleware, getEnrollmentByIdController);
router.delete("/enrollments/:id", authMiddleware, deleteEnrollmentController);

export default router;
