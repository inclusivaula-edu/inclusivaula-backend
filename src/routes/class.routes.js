import express from "express";
import {
  createClassController,
  getClassesController,
  getClassByIdController,
  updateClassController,
  deleteClassController
} from "../controllers/class.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";

const router = express.Router();

router.post("/classes", authMiddleware, createClassController);
router.get("/classes", authMiddleware, getClassesController);
router.get("/classes/:id", authMiddleware, tenantGuard("class"), getClassByIdController);
router.put("/classes/:id", authMiddleware, tenantGuard("class"), updateClassController);
router.delete("/classes/:id", authMiddleware, tenantGuard("class"), deleteClassController);

export default router;
