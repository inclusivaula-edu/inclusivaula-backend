import express from "express";
import crypto from "crypto";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { supabase } from "../config/supabase.js";
import { getCurrentPlan } from "../services/billing.service.js";
import { internalError } from "../utils/sanitize.js";

const router = express.Router();

function gerarCodigo() {
  return crypto.randomBytes(6).toString("base64url").replace(/[-_]/g, "").toUpperCase().substring(0, 8);
}

// Código de convite da escola + situação de vagas — coordenador+
router.get("/school/invite", authMiddleware, secureMiddleware, requireRole("coordenador"), async (req, res) => {
  try {
    const { data: school, error } = await supabase
      .from("schools")
      .select("id, name, invite_code")
      .eq("id", req.schoolId)
      .single();
    if (error || !school) return res.status(404).json({ success: false, error: "Escola não encontrada" });

    // Garante que a escola tem código (escolas antigas podem não ter)
    let inviteCode = school.invite_code;
    if (!inviteCode) {
      inviteCode = gerarCodigo();
      await supabase.from("schools").update({ invite_code: inviteCode }).eq("id", school.id);
    }

    const { count: professoresAtivos } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("school_id", req.schoolId);

    const plan = await getCurrentPlan(req.schoolId);

    return res.json({
      success: true,
      data: {
        schoolName: school.name,
        inviteCode,
        professoresAtivos: professoresAtivos || 0,
        professoresLimite: plan.professores_limite,
        plano: plan.plan
      }
    });
  } catch (error) {
    console.error("school/invite:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

// Gera novo código (invalida o anterior) — diretor+
router.post("/school/invite/rotate", authMiddleware, secureMiddleware, requireRole("diretor"), async (req, res) => {
  try {
    const novoCodigo = gerarCodigo();
    const { error } = await supabase
      .from("schools")
      .update({ invite_code: novoCodigo })
      .eq("id", req.schoolId);
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: { inviteCode: novoCodigo } });
  } catch (error) {
    console.error("school/invite/rotate:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

export default router;
