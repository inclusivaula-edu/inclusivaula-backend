import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

// 🔐 middlewares globais (IMPORTANTE)
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

// 🔥 middlewares globais
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 🧠 rota de saúde
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 InclusivAula API online"
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

// 🚨 middleware global de erro (OBRIGATÓRIO EM PROD)
app.use(errorHandler);

export default app;