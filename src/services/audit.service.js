import { supabase } from "../config/supabase.js";
import { logger } from "../config/logger.js";

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "login.success",
  LOGIN_FAILURE: "login.failure",
  PLAN_SUBSCRIBE: "billing.subscribe",
  PLAN_CANCEL: "billing.cancel",
  STUDENT_DELETE: "student.delete",
  TEACHER_INVITE: "teacher.invite",
  TEACHER_REMOVE: "teacher.remove",
  ROLE_CHANGE: "role.change",
  REPORT_GENERATE: "report.generate",
  PEI_APPROVE: "pei.approve",
  AEE_APPROVE: "aee.approve",
  ACCESS_DENIED: "access.denied",
  TENANT_VIOLATION: "tenant.violation"
};

export async function audit({ req, action, resourceType = null, resourceId = null, status = "success", metadata = {} }) {
  try {
    const ip = req?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
      || req?.headers?.["x-real-ip"]
      || req?.ip
      || null;
    const userAgent = req?.headers?.["user-agent"]?.slice(0, 500) || null;

    await supabase.from("audit_logs").insert({
      user_id: req?.user?.id || null,
      school_id: req?.schoolId || null,
      action,
      resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : null,
      ip_address: ip,
      user_agent: userAgent,
      status,
      metadata
    });
  } catch (err) {
    logger.error({ err: err.message, action }, "audit log failure");
  }
}

export function auditMiddleware(action, resourceTypeOrFn = null) {
  return (req, res, next) => {
    res.on("finish", () => {
      const ok = res.statusCode < 400;
      const resourceType = typeof resourceTypeOrFn === "function" ? resourceTypeOrFn(req) : resourceTypeOrFn;
      const resourceId = req.params?.id || req.params?.studentId || req.params?.reportId || null;
      audit({
        req,
        action,
        resourceType,
        resourceId,
        status: ok ? "success" : "failure",
        metadata: { statusCode: res.statusCode, method: req.method, path: req.originalUrl }
      });
    });
    next();
  };
}
