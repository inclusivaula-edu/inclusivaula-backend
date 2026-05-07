import express from "express";

import {
  getDashboardController
} from "../controllers/dashboard.controller.js";

import {
  authMiddleware
} from "../middlewares/auth.middleware.js";

import {
  roleMiddleware
} from "../middlewares/role.middleware.js";

const router = express.Router();

// ✅ dashboard IA
// 🔒 apenas coordenação e gestão
router.get(
  "/dashboard",

  authMiddleware,

  roleMiddleware(
    "coordinator",
    "manager"
  ),

  getDashboardController
);

export default router;