import { config } from "dotenv";
config();

const { default: app } = await import("./app.js");

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`🚀 InclusivAula API rodando em http://localhost:${PORT}`);
  console.log(`📚 Swagger disponível em http://localhost:${PORT}/docs`);
});