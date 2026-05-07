import express from "express";

import {
  createEnrollmentController,
  getEnrollmentsController,
  getEnrollmentByIdController,
  deleteEnrollmentController
} from "../controllers/enrollment.controller.js";

const router = express.Router();

// ✅ criar matrícula
router.post(
  "/enrollments",
  createEnrollmentController
);

// ✅ listar matrículas
router.get(
  "/enrollments",
  getEnrollmentsController
);

// ✅ buscar matrícula
router.get(
  "/enrollments/:id",
  getEnrollmentByIdController
);

// ✅ remover matrícula
router.delete(
  "/enrollments/:id",
  deleteEnrollmentController
);

export default router;