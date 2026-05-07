import express from "express";

import {
  createTeacherController,
  getTeachersController,
  getTeacherByIdController,
  updateTeacherController,
  deleteTeacherController
} from "../controllers/teacher.controller.js";

const router = express.Router();

// ✅ criar
router.post(
  "/teachers",
  createTeacherController
);

// ✅ listar
router.get(
  "/teachers",
  getTeachersController
);

// ✅ buscar por id
router.get(
  "/teachers/:id",
  getTeacherByIdController
);

// ✅ atualizar
router.put(
  "/teachers/:id",
  updateTeacherController
);

// ✅ deletar
router.delete(
  "/teachers/:id",
  deleteTeacherController
);

export default router;