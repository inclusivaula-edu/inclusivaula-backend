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

    const { data: perfis } = await supabase
      .from("profiles")
      .select("cargo")
      .eq("school_id", req.schoolId);

    const plan = await getCurrentPlan(req.schoolId);

    // Plano gratuito: 6 vagas com papéis definidos
    let vagasFree = null;
    if (plan.plan === "free") {
      const slotDoCargo = (cargo) => {
        if (cargo === "diretor") return "diretor";
        if (["coordenador", "coordenador_municipal", "coordenador_estadual", "secretario_municipal", "secretario_estadual"].includes(cargo)) return "coordenador";
        if (cargo === "aee") return "aee";
        return "professor";
      };
      const usadas = { diretor: 0, coordenador: 0, aee: 0, professor: 0 };
      for (const p of perfis || []) usadas[slotDoCargo(p.cargo || "professor")]++;
      vagasFree = {
        diretor: { usadas: usadas.diretor, limite: 1, rotulo: "Diretor(a)" },
        coordenador: { usadas: usadas.coordenador, limite: 1, rotulo: "Coordenador(a) pedagógico(a)" },
        aee: { usadas: usadas.aee, limite: 1, rotulo: "Profissional de AEE" },
        professor: { usadas: usadas.professor, limite: 3, rotulo: "Professores(as)" }
      };
    }

    return res.json({
      success: true,
      data: {
        schoolName: school.name,
        inviteCode,
        professoresAtivos: (perfis || []).length,
        professoresLimite: plan.professores_limite,
        plano: plan.plan,
        vagasFree
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
