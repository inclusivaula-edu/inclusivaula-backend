import { logger } from "../config/logger.js";

export const errorHandler = (err, req, res, next) => {
  logger.error({ err, method: req.method, url: req.originalUrl }, "Unhandled error");

  res.status(500).json({
    success: false,
    error: "Erro interno no servidor",
    details: process.env.NODE_ENV === "development"
      ? err.message
      : undefined
  });
};