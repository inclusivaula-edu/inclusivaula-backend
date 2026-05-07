import express from "express";

import {
  createAttendanceController,
  getAttendanceController,
  getAttendanceByIdController,
  updateAttendanceController,
  deleteAttendanceController
} from "../controllers/attendance.controller.js";

const router = express.Router();

// ✅ criar
router.post(
  "/attendance",
  createAttendanceController
);

// ✅ listar
router.get(
  "/attendance",
  getAttendanceController
);

// ✅ buscar por id
router.get(
  "/attendance/:id",
  getAttendanceByIdController
);

// ✅ atualizar
router.put(
  "/attendance/:id",
  updateAttendanceController
);

// ✅ deletar
router.delete(
  "/attendance/:id",
  deleteAttendanceController
);

export default router;