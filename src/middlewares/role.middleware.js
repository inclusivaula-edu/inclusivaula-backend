export const roleMiddleware =
(...allowedRoles) => {

  return (req, res, next) => {

    try {

      if (
        !allowedRoles.includes(req.role)
      ) {

        return res.status(403).json({
          success: false,
          error: "Acesso negado"
        });
      }

      next();

    } catch (error) {

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
};