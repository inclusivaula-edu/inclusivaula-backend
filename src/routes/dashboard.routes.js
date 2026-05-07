import express from "express";

import {
  getDashboardController
} from "../controllers/dashboard.controller.js";

const router = express.Router();

// ✅ dashboard IA
router.get(
  "/dashboard",
  getDashboardController
);

export default router;