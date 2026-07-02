import express from "express";
import {
  generateSimulado,
  getSimuladoStatus,
  listSimuladosHandler,
  deleteSimulado,
  getSimuladoPDF
} from "../controllers/simulado.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";

const router = express.Router();

router.post("/simulado/generate", authMiddleware, secureMiddleware, generateSimulado);
router.get("/simulado/:id/status", authMiddleware, secureMiddleware, getSimuladoStatus);
router.get("/simulado/:id/pdf", authMiddleware, secureMiddleware, getSimuladoPDF);
router.get("/simulados", authMiddleware, secureMiddleware, listSimuladosHandler);
router.delete("/simulado/:id", authMiddleware, secureMiddleware, deleteSimulado);

export default router;
