import express from "express";
import { getDashboardController } from "../controllers/dashboard.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";

const router = express.Router();

// Dashboard IA — apenas coordenação e gestão (coordenador+)
router.get("/dashboard", authMiddleware, secureMiddleware, requireRole("coordenador"), getDashboardController);

export default router;
