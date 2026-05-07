export const secureMiddleware = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Não autenticado"
    });
  }

  if (!req.user?.school_id) {
    return res.status(403).json({
      success: false,
      error: "Escola não identificada"
    });
  }

  req.schoolId = req.user.school_id;

  next();
};