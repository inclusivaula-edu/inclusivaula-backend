import express from "express";

import {
  getPredictionsController
} from "../controllers/prediction.controller.js";

const router = express.Router();

// 🔮 previsões IA
router.get(
  "/predictions",
  getPredictionsController
);

export default router;