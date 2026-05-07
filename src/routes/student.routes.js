import express from "express";

import {
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController
} from "../controllers/student.controller.js";

import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 🔐 todas protegidas

router.post(
  "/students",
  createStudentController
);

router.get(
  "/students",
  authMiddleware,
  getStudentsController
);

router.get(
  "/students/:id",
  authMiddleware,
  getStudentByIdController
);

router.put(
  "/students/:id",
  authMiddleware,
  updateStudentController
);

router.delete(
  "/students/:id",
  authMiddleware,
  deleteStudentController
);

export default router;