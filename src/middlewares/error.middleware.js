export const errorHandler = (err, req, res, next) => {

  console.error("🔥 ERROR:", err);

  res.status(500).json({
    success: false,
    error: "Erro interno no servidor",
    details: process.env.NODE_ENV === "development"
      ? err.message
      : undefined
  });
};