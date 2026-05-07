import "dotenv/config";

import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

// 🔍 validação básica de ambiente
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error("❌ Variáveis de ambiente do Supabase não configuradas!");
  process.exit(1);
}

// 🧠 logs de inicialização
console.log("🚀 Iniciando InclusivAula...");
console.log("📡 SUPABASE:", "OK");

// 🚀 servidor
app.listen(PORT, () => {
  console.log(`🚀 InclusivAula rodando na porta ${PORT}`);
});