import express from "express";
import {
  createTeacherController,
  getTeachersController,
  getTeacherByIdController,
  updateTeacherController,
  deleteTeacherController
} from "../controllers/teacher.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";
import { auditMiddleware, AUDIT_ACTIONS } from "../services/audit.service.js";

const router = express.Router();

router.post("/teachers", authMiddleware, auditMiddleware(AUDIT_ACTIONS.TEACHER_INVITE, "teacher"), createTeacherController);
router.get("/teachers", authMiddleware, getTeachersController);
router.get("/teachers/:id", authMiddleware, tenantGuard("teacher"), getTeacherByIdController);
router.put("/teachers/:id", authMiddleware, tenantGuard("teacher"), updateTeacherController);
router.delete("/teachers/:id", authMiddleware, tenantGuard("teacher"), auditMiddleware(AUDIT_ACTIONS.TEACHER_REMOVE, "teacher"), deleteTeacherController);

export default router;
