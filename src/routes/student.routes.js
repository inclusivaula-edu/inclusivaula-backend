import express from "express";
import {
  createStudentController,
  getStudentsController,
  getStudentByIdController,
  updateStudentController,
  deleteStudentController
} from "../controllers/student.controller.js";
import { importStudentsController } from "../controllers/student-import.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { tenantGuard } from "../middlewares/tenantGuard.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { auditMiddleware, AUDIT_ACTIONS } from "../services/audit.service.js";

const router = express.Router();

router.post("/students", authMiddleware, createStudentController);
router.post("/students/import", authMiddleware, requireRole("coordenador"), importStudentsController);
router.get("/students", authMiddleware, getStudentsController);
router.get("/students/:id", authMiddleware, tenantGuard("student"), getStudentByIdController);
router.put("/students/:id", authMiddleware, tenantGuard("student"), updateStudentController);
router.delete("/students/:id", authMiddleware, tenantGuard("student"), auditMiddleware(AUDIT_ACTIONS.STUDENT_DELETE, "student"), deleteStudentController);

export default router;
