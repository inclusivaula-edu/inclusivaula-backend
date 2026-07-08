import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";
import { requireRole } from "../middlewares/role.middleware.js";
import { getSchoolOverview, getNetworkOverview, getGlobalOverview } from "../services/management.service.js";
import { internalError } from "../utils/sanitize.js";

const router = express.Router();

// Painel da escola — coordenador+
router.get("/management/school", authMiddleware, secureMiddleware, requireRole("coordenador"), async (req, res) => {
  try {
    const data = await getSchoolOverview(req.schoolId);
    return res.json({ success: true, data });
  } catch (error) {
    console.error("management/school:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

// Painel da rede — secretaria+ (usa a rede do próprio usuário)
router.get("/management/network", authMiddleware, requireRole("secretaria"), async (req, res) => {
  try {
    const networkId = req.profile?.network_id;
    if (!networkId) {
      return res.status(400).json({
        success: false,
        error: "Seu perfil ainda não está vinculado a uma rede de ensino. Solicite o vínculo ao suporte."
      });
    }
    const data = await getNetworkOverview(networkId);
    if (!data) return res.status(404).json({ success: false, error: "Rede não encontrada" });
    return res.json({ success: true, data });
  } catch (error) {
    console.error("management/network:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

// Panorama global — apenas mec (contagens anônimas, sem dados de titulares)
router.get("/management/global", authMiddleware, requireRole("mec"), async (req, res) => {
  try {
    const data = await getGlobalOverview();
    return res.json({ success: true, data });
  } catch (error) {
    console.error("management/global:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

export default router;
