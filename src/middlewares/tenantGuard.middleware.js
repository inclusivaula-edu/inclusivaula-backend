import { supabase } from "../config/supabase.js";
import { audit, AUDIT_ACTIONS } from "../services/audit.service.js";

// Mapa de "tipo de recurso" → tabela (todas devem ter coluna school_id)
const RESOURCE_TABLES = {
  student: "students",
  teacher: "teachers",
  class: "classes",
  enrollment: "enrollments",
  attendance: "attendance",
  evaluation: "evaluations",
  report: "reports",
  lesson: "lessons",
  pei: "pei_documents",
  aee: "aee_documents",
  aee_session: "aee_sessions",
  activity: "activities",
  assessment: "assessments"
};

/**
 * tenantGuard("student") aplica em rotas /:id ou /:studentId/* — verifica que o
 * recurso pertence à mesma school do usuário. Bloqueia IDOR cross-tenant.
 */
export function tenantGuard(resourceType, paramName = "id") {
  const table = RESOURCE_TABLES[resourceType];
  if (!table) throw new Error(`tenantGuard: tipo desconhecido "${resourceType}"`);

  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      if (!resourceId) return next();

      if (!req.schoolId) {
        return res.status(403).json({ success: false, error: "Escola não identificada" });
      }

      const { data, error } = await supabase
        .from(table)
        .select("school_id")
        .eq("id", resourceId)
        .single();

      if (error || !data) {
        return res.status(404).json({ success: false, error: "Recurso não encontrado" });
      }

      if (data.school_id !== req.schoolId) {
        // Tentativa de cross-tenant — registrar e bloquear
        audit({
          req,
          action: AUDIT_ACTIONS.TENANT_VIOLATION,
          resourceType,
          resourceId,
          status: "failure",
          metadata: { resourceSchoolId: data.school_id, userSchoolId: req.schoolId }
        });
        return res.status(403).json({ success: false, error: "Acesso negado" });
      }

      next();
    } catch (err) {
      return res.status(500).json({ success: false, error: "Erro de autorização" });
    }
  };
}
