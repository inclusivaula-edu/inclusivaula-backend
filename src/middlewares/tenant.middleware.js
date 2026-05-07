export const tenantMiddleware =
(req, res, next) => {

  try {

    // 🔥 escola enviada no header
    const schoolId =
      req.headers["x-school-id"];

    if (!schoolId) {

      return res.status(400).json({
        success: false,
        error: "school_id não enviado"
      });
    }

    // 🔥 injeta na request
    req.schoolId = schoolId;

    next();

  } catch (error) {

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};