import express from "express";

import {
  createDisabilityController,
  getDisabilitiesController,
  getDisabilityByIdController,
  updateDisabilityController,
  deleteDisabilityController
} from "../controllers/disability.controller.js";

const router = express.Router();

// ✅ criar
router.post(
  "/disabilities",
  createDisabilityController
);

// ✅ listar
router.get(
  "/disabilities",
  getDisabilitiesController
);

// ✅ buscar por id
router.get(
  "/disabilities/:id",
  getDisabilityByIdController
);

// ✅ atualizar
router.put(
  "/disabilities/:id",
  updateDisabilityController
);

// ✅ deletar
router.delete(
  "/disabilities/:id",
  deleteDisabilityController
);

export default router;