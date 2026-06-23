import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";
import {
  getPlan,
  subscribePlan,
  cancelPlan,
  handleWebhook
} from "../controllers/billing.controller.js";

const router = express.Router();

// Webhook sem autenticação — validado por token Asaas no header
router.post("/billing/webhook", handleWebhook);

// Qualquer usuário autenticado pode ver o plano da escola
router.get("/billing/plan", authMiddleware, getPlan);

// Apenas admin da escola pode contratar ou cancelar
router.post("/billing/subscribe", authMiddleware, roleMiddleware("school_admin"), subscribePlan);
router.delete("/billing/cancel", authMiddleware, roleMiddleware("school_admin"), cancelPlan);

export default router;
