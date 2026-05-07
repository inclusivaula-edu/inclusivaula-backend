import dotenv from "dotenv";
import express from "express";
import cors from "cors";

import lessonRoutes from "./routes/lesson.routes.js";
import studentRoutes from "./routes/student.routes.js";

dotenv.config();

const app = express();

// 🔥 middlewares globais
app.use(cors());
app.use(express.json());

// ✅ rota raiz
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 InclusivAula API online"
  });
});

// ✅ rotas da API
app.use("/api", lessonRoutes);
app.use("/api", studentRoutes);

// ❌ rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Rota não encontrada"
  });
});

export default app;