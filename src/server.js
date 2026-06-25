// Sentry DEVE ser o primeiro import — captura erros desde o boot
import "./instrument.js";

import { config } from "dotenv";
config();

// Polyfill global crypto for Node.js 18 (uuid v14 uses crypto.randomUUID)
import { webcrypto } from "crypto";
if (!globalThis.crypto) globalThis.crypto = webcrypto;

// ── Crash handlers — reporta ao Sentry antes de morrer ──
import * as Sentry from "@sentry/node";
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Rejection:", reason);
  Sentry.captureException(reason);
  process.exit(1);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  Sentry.captureException(err);
  process.exit(1);
});

const REQUIRED = ["SUPABASE_URL", "SUPABASE_KEY", "OPENAI_API_KEY"];
const missing = REQUIRED.filter(k => !process.env[k] || process.env[k].startsWith("SUBSTITUA"));
if (missing.length) {
  console.error(`❌ Variáveis obrigatórias não configuradas: ${missing.join(", ")}`);
  process.exit(1);
}

if (!process.env.ASAAS_API_KEY) {
  console.warn("⚠️  ASAAS_API_KEY não definida — módulo de pagamento desativado");
}

const { default: app } = await import("./app.js");

const PORT = process.env.PORT ?? 3000;
const isProduction = process.env.NODE_ENV === "production";

app.listen(PORT, () => {
  console.log(`🚀 InclusivAula API rodando na porta ${PORT} [${isProduction ? "production" : "development"}]`);
  if (!isProduction) {
    console.log(`📚 Swagger: http://localhost:${PORT}/docs`);
  }
});