import express from "express";
import { supabase } from "../config/supabase.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { roleMiddleware } from "../middlewares/role.middleware.js";

const router = express.Router();

// Lista os audit_logs da escola do usuário (só admin/coord)
router.get("/audit-logs", authMiddleware, roleMiddleware("school_admin", "coordinator"), async (req, res) => {
  try {
    const { action, status, limit = 100 } = req.query;
    let q = supabase
      .from("audit_logs")
      .select("id, created_at, user_id, action, resource_type, resource_id, ip_address, status, metadata")
      .eq("school_id", req.schoolId)
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(limit), 500));

    if (action) q = q.eq("action", action);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Erro ao buscar logs" });
  }
});

// Lista alertas de segurança (só admin)
router.get("/security-alerts", authMiddleware, roleMiddleware("school_admin"), async (req, res) => {
  try {
    const { resolved, severity, limit = 50 } = req.query;
    let q = supabase
      .from("security_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(Number(limit), 200));

    if (resolved === "false") q = q.eq("resolved", false);
    if (resolved === "true") q = q.eq("resolved", true);
    if (severity) q = q.eq("severity", severity);

    const { data, error } = await q;
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Erro ao buscar alertas" });
  }
});

// Executa watchdog manualmente (só admin)
router.post("/security-watchdog", authMiddleware, roleMiddleware("school_admin"), async (req, res) => {
  try {
    const { data, error } = await supabase.rpc("fn_security_watchdog");
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Erro ao executar watchdog" });
  }
});

// Resolver alerta (só admin)
router.patch("/security-alerts/:id/resolve", authMiddleware, roleMiddleware("school_admin"), async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("security_alerts")
      .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: req.user.id })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Erro ao resolver alerta" });
  }
});

export default router;
