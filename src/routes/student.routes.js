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

router.post("/students", authMiddleware, createStudentController);
router.get("/students", authMiddleware, getStudentsController);
router.get("/students/:id", authMiddleware, getStudentByIdController);
router.put("/students/:id", authMiddleware, updateStudentController);
router.delete("/students/:id", authMiddleware, deleteStudentController);

export default router;
