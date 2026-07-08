import express from "express";
import { supabase } from "../config/supabase.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { audit, AUDIT_ACTIONS } from "../services/audit.service.js";
import { internalError } from "../utils/sanitize.js";

const router = express.Router();

/**
 * LGPD Art. 18 — Direitos do titular.
 * Exportação (portabilidade) e exclusão de conta do PRÓPRIO usuário.
 * Dados de alunos pertencem à escola (controladora) e não são afetados.
 */

// Exporta todos os dados pessoais e conteúdos gerados pelo usuário (JSON)
router.get("/lgpd/export", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [profile, teacher, lessons, activities, peis, aees] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("teachers").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("lessons").select("id, created_at, status, input, result").eq("teacher_id", userId),
      supabase.from("activities").select("id, created_at, title, description, activity_type, questions, gabarito").eq("teacher_id", userId),
      supabase.from("pei_documents").select("id, created_at, status, periodo").eq("teacher_id", userId),
      supabase.from("aee_documents").select("id, created_at, status, periodo").eq("teacher_id", userId)
    ]);

    const exportData = {
      gerado_em: new Date().toISOString(),
      titular: profile.data || null,
      registro_professor: teacher.data || null,
      aulas_geradas: lessons.data || [],
      atividades_geradas: activities.data || [],
      documentos_pei: peis.data || [],
      documentos_aee: aees.data || []
    };

    audit({ req, action: AUDIT_ACTIONS.DATA_EXPORT || "data_export", resourceType: "profile", resourceId: userId, status: "success" });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="inclusivaula-meus-dados-${userId.slice(0, 8)}.json"`);
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error("lgpd/export:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

// Exclui a própria conta (auth + perfil + registro de professor)
router.delete("/lgpd/account", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Administrador de escola precisa transferir a gestão antes de excluir
    const { data: ownedSchool } = await supabase
      .from("schools").select("id").eq("admin_user_id", userId).maybeSingle();
    if (ownedSchool) {
      return res.status(409).json({
        success: false,
        error: "Você é o administrador da escola. Transfira a administração antes de excluir sua conta."
      });
    }

    audit({ req, action: AUDIT_ACTIONS.ACCOUNT_DELETE || "account_delete", resourceType: "profile", resourceId: userId, status: "success" });

    // Remove registros pessoais; conteúdo pedagógico da escola é preservado
    await supabase.from("teachers").delete().eq("user_id", userId);
    await supabase.from("users").delete().eq("id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw new Error(authError.message);

    return res.json({ success: true, message: "Conta excluída. Seus dados pessoais foram removidos." });
  } catch (error) {
    console.error("lgpd/account:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

export default router;
