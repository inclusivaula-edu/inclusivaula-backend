import express from "express";
import { getAlertsController } from "../controllers/alert.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/alerts", authMiddleware, getAlertsController);

export default router;
