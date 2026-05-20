import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// 🔐 middlewares globais
import { authMiddleware } from "./middlewares/auth.middleware.js";
import { secureMiddleware } from "./middlewares/secure.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";

// 📦 rotas
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

const app = express();

// 🛡️ segurança de headers
app.use(helmet());

// 🚦 rate limiting global (100 requests por IP a cada 15 minutos)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Muitas requisições. Tente novamente em alguns minutos."
  }
});
app.use("/api", limiter);

// 🔥 middlewares globais
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 📚 Swagger
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
  apis: ["./src/routes/*.js"]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 🧠 rota de saúde
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 InclusivAula API online",
    version: "1.0.0",
    docs: "/docs"
  });
});

// 🔐 rotas da API
app.use("/api", lessonRoutes);
app.use("/api", studentRoutes);
app.use("/api", teacherRoutes);
app.use("/api", classRoutes);
app.use("/api", enrollmentRoutes);
app.use("/api", disabilityRoutes);
app.use("/api", attendanceRoutes);
app.use("/api", evaluationRoutes);
app.use("/api", reportRoutes);
app.use("/api", dashboardRoutes);
app.use("/api", alertRoutes);
app.use("/api", predictionRoutes);

// ❌ rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada"
  });
});

// 🚨 middleware global de erro
app.use(errorHandler);

export default app;