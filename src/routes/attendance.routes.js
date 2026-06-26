import express from "express";
import {
  createAttendanceController,
  getAttendanceController,
  getAttendanceByIdController,
  updateAttendanceController,
  deleteAttendanceController
} from "../controllers/attendance.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";

const router = express.Router();

router.post("/attendance", authMiddleware, createAttendanceController);
router.get("/attendance", authMiddleware, getAttendanceController);
router.get("/attendance/:id", authMiddleware, tenantGuard("attendance"), getAttendanceByIdController);
router.put("/attendance/:id", authMiddleware, tenantGuard("attendance"), updateAttendanceController);
router.delete("/attendance/:id", authMiddleware, tenantGuard("attendance"), deleteAttendanceController);

export default router;
