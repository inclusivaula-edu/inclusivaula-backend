import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { requireMFA } from "../middlewares/mfa.middleware.js";
import { auditMiddleware, AUDIT_ACTIONS } from "../services/audit.service.js";
import {
  getPlan,
  subscribePlan,
  cancelPlan,
  handleWebhook
} from "../controllers/billing.controller.js";

const router = express.Router();

router.post("/billing/webhook", handleWebhook);
router.get("/billing/plan", authMiddleware, getPlan);

router.post("/billing/subscribe",
  authMiddleware,
  requireRole("diretor"),
  requireMFA,
  auditMiddleware(AUDIT_ACTIONS.PLAN_SUBSCRIBE, "subscription"),
  subscribePlan
);
router.delete("/billing/cancel",
  authMiddleware,
  requireRole("diretor"),
  requireMFA,
  auditMiddleware(AUDIT_ACTIONS.PLAN_CANCEL, "subscription"),
  cancelPlan
);

export default router;
