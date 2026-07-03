const ROLE_HIERARCHY = ["professor", "coordenador", "diretor", "secretaria", "mec"];

function roleLevel(role) {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? 0 : idx;
}

export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.role)) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }
    next();
  };
};

export const requireRole = (minRole) => {
  const minLevel = roleLevel(minRole);
  return (req, res, next) => {
    if (roleLevel(req.role) < minLevel) {
      return res.status(403).json({ success: false, error: "Acesso negado — cargo insuficiente" });
    }
    next();
  };
};

export { ROLE_HIERARCHY, roleLevel };