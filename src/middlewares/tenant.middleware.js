// schoolId é sempre derivado do perfil autenticado (req.schoolId definido pelo authMiddleware).
// Este middleware valida que ele está presente e, se um header x-school-id for enviado,
// garante que ele coincide com o da escola do usuário — prevenindo substituição via header.
export const tenantMiddleware = (req, res, next) => {
  try {
    if (!req.schoolId) {
      return res.status(403).json({
        success: false,
        error: "Escola não identificada. Autentique-se primeiro."
      });
    }

    const headerSchoolId = req.headers["x-school-id"];
    if (headerSchoolId && headerSchoolId !== req.schoolId) {
      return res.status(403).json({
        success: false,
        error: "Escola não autorizada"
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor"
    });
  }
};
