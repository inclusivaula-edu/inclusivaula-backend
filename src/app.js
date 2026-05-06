import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import lessonRoutes from "./routes/lesson.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", lessonRoutes);

export default app;