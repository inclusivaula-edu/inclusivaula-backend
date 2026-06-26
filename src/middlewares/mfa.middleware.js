import { Buffer } from "buffer";
import { audit, AUDIT_ACTIONS } from "../services/audit.service.js";

/**
 * Decodifica o claim aal do JWT (sem verificar — a verificação já foi feita pelo authMiddleware).
 * AAL1 = só password. AAL2 = password + segundo fator (TOTP).
 * Usado para forçar 2FA em rotas administrativas.
 */
function readAal(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return payload.aal || "aal1";
  } catch {
    return "aal1";
  }
}

export const requireMFA = (req, res, next) => {
  const token = req.headers.authorization?.slice(7).trim();
  if (!token) return res.status(401).json({ success: false, error: "Token ausente" });

  const aal = readAal(token);
  if (aal !== "aal2") {
    audit({ req, action: AUDIT_ACTIONS.ACCESS_DENIED, status: "failure", metadata: { reason: "mfa_required", aal } });
    return res.status(403).json({
      success: false,
      error: "Autenticação de 2 fatores obrigatória para esta ação",
      code: "MFA_REQUIRED"
    });
  }

  next();
};
