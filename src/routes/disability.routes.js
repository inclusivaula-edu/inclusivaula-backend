import express from "express";
import {
  createDisabilityController,
  getDisabilitiesController,
  getDisabilityByIdController,
  updateDisabilityController,
  deleteDisabilityController
} from "../controllers/disability.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/disabilities", authMiddleware, createDisabilityController);
router.get("/disabilities", authMiddleware, getDisabilitiesController);
router.get("/disabilities/:id", authMiddleware, getDisabilityByIdController);
router.put("/disabilities/:id", authMiddleware, updateDisabilityController);
router.delete("/disabilities/:id", authMiddleware, deleteDisabilityController);

export default router;
