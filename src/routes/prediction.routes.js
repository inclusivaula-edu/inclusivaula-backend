import express from "express";
import { getPredictionsController } from "../controllers/prediction.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/predictions", authMiddleware, getPredictionsController);

export default router;
