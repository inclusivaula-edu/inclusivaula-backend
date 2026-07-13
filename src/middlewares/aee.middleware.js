import { ROLES_GESTAO } from "../utils/visibility.js";

// Recursos de AEE (PAEE, sessões, estudo de caso) são restritos a
// profissionais de AEE (cargo "aee") e à gestão (coordenador+).
export function requireAEE(req, res, next) {
  if (req.cargo === "aee" || ROLES_GESTAO.includes(req.role)) return next();
  return res.status(403).json({
    success: false,
    error: "Acesso restrito a profissionais de AEE e à gestão da escola."
  });
}
