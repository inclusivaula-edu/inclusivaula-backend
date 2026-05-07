import express from "express";

import {
  createClassController,
  getClassesController,
  getClassByIdController,
  updateClassController,
  deleteClassController
} from "../controllers/class.controller.js";

const router = express.Router();

// ✅ criar
router.post(
  "/classes",
  createClassController
);

// ✅ listar
router.get(
  "/classes",
  getClassesController
);

// ✅ buscar por id
router.get(
  "/classes/:id",
  getClassByIdController
);

// ✅ atualizar
router.put(
  "/classes/:id",
  updateClassController
);

// ✅ deletar
router.delete(
  "/classes/:id",
  deleteClassController
);

export default router;