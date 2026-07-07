import express from "express";
import {
  createDisabilityController,
  getDisabilitiesController,
  getDisabilityByIdController,
  updateDisabilityController,
  deleteDisabilityController
} from "../controllers/disability.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";

const router = express.Router();

router.post("/disabilities", authMiddleware, secureMiddleware, createDisabilityController);
router.get("/disabilities", authMiddleware, secureMiddleware, getDisabilitiesController);
router.get("/disabilities/:id", authMiddleware, secureMiddleware, tenantGuard("disability"), getDisabilityByIdController);
router.put("/disabilities/:id", authMiddleware, secureMiddleware, tenantGuard("disability"), updateDisabilityController);
router.delete("/disabilities/:id", authMiddleware, secureMiddleware, tenantGuard("disability"), deleteDisabilityController);

export default router;
