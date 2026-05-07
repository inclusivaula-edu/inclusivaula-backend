import express from "express";

import {
  getAlertsController
} from "../controllers/alert.controller.js";

const router = express.Router();

// 🚨 alertas IA
router.get(
  "/alerts",
  getAlertsController
);

export default router;