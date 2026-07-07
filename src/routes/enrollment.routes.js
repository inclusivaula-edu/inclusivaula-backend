import express from "express";
import {
  createEnrollmentController,
  getEnrollmentsController,
  getEnrollmentByIdController,
  deleteEnrollmentController
} from "../controllers/enrollment.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";

const router = express.Router();

router.post("/enrollments", authMiddleware, secureMiddleware, createEnrollmentController);
router.get("/enrollments", authMiddleware, secureMiddleware, getEnrollmentsController);
router.get("/enrollments/:id", authMiddleware, secureMiddleware, getEnrollmentByIdController);
router.delete("/enrollments/:id", authMiddleware, secureMiddleware, deleteEnrollmentController);

export default router;
