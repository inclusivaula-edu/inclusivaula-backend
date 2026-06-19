import express from "express";
import {
  createTeacherController,
  getTeachersController,
  getTeacherByIdController,
  updateTeacherController,
  deleteTeacherController
} from "../controllers/teacher.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/teachers", authMiddleware, createTeacherController);
router.get("/teachers", authMiddleware, getTeachersController);
router.get("/teachers/:id", authMiddleware, getTeacherByIdController);
router.put("/teachers/:id", authMiddleware, updateTeacherController);
router.delete("/teachers/:id", authMiddleware, deleteTeacherController);

export default router;
