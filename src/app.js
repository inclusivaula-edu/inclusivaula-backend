import { fileURLToPath } from "url";
import { dirname, join } from "path";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { authMiddleware } from "./middlewares/auth.middleware.js";
import { secureMiddleware } from "./middlewares/secure.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { logger } from "./config/logger.js";

import lessonRoutes from "./routes/lesson.routes.js";
import studentRoutes from "./routes/student.routes.js";
import teacherRoutes from "./routes/teacher.routes.js";
import classRoutes from "./routes/class.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import disabilityRoutes from "./routes/disability.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import evaluationRoutes from "./routes/evaluation.routes.js";
import reportRoutes from "./routes/report.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import predictionRoutes from "./routes/prediction.routes.js";
import exerciseRoutes from "./routes/exercise.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import peiRoutes from "./routes/pei.routes.js";
import aeeSessionsRoutes from "./routes/aee-sessions.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.set("trust proxy", 1);

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim()).filter(Boolean)
  : [];

if (process.env.NODE_ENV === "production" && allowedOrigins.length === 0) {
  console.error("ERRO: ALLOWED_ORIGINS não configurado em produção. Configure esta variável na Railway.");
  process.exit(1);
}

app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? allowedOrigins
    : true,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers.authorization || ipKeyGenerator(req),
  message: {
    success: false,
    error: "Muitas requisições. Tente novamente em alguns minutos."
  }
});

// Rate limit restritivo para endpoints que chamam IA (OpenAI)
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers.authorization || ipKeyGenerator(req),
  message: {
    success: false,
    error: "Limite de geração por IA atingido. Aguarde alguns minutos."
  }
});

app.use("/api", limiter);
app.use("/api/lessons", aiLimiter);
app.use("/api/reports", aiLimiter);
app.use("/api/exercises/generate", aiLimiter);
app.use("/api/exercises/rubrica", aiLimiter);
app.use("/api/pei/generate", aiLimiter);
app.use("/api/aee/generate", aiLimiter);

app.use(express.json({ limit: "200kb" }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    logger[level]({ method: req.method, url: req.originalUrl, status: res.statusCode, ms }, "request");
  });
  next();
});

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "InclusivAula API",
      version: "1.0.0",
      description: "API oficial da plataforma InclusivAula"
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [join(__dirname, "routes", "*.js")]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

if (process.env.SWAGGER_ENABLED === "true") {
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "InclusivAula API online",
    version: "1.0.0"
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", lessonRoutes);
app.use("/api", studentRoutes);
app.use("/api", teacherRoutes);
app.use("/api", classRoutes);
app.use("/api", enrollmentRoutes);
app.use("/api", disabilityRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", evaluationRoutes);
app.use("/api", reportRoutes);
app.use("/api", exerciseRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", alertRoutes);
app.use("/api", predictionRoutes);
app.use("/api", billingRoutes);
app.use("/api", peiRoutes);
app.use("/api", aeeSessionsRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada"
  });
});

app.use(errorHandler);

export default app;
