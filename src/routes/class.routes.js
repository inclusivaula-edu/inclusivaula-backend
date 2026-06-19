import express from "express";
import {
  createClassController,
  getClassesController,
  getClassByIdController,
  updateClassController,
  deleteClassController
} from "../controllers/class.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/classes", authMiddleware, createClassController);
router.get("/classes", authMiddleware, getClassesController);
router.get("/classes/:id", authMiddleware, getClassByIdController);
router.put("/classes/:id", authMiddleware, updateClassController);
router.delete("/classes/:id", authMiddleware, deleteClassController);

export default router;
