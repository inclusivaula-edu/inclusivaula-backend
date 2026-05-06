import "dotenv/config"; // 👈 carrega o .env antes de tudo

import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

// 🔍 DEBUG (pode remover depois)
console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("SUPABASE_KEY:", process.env.SUPABASE_KEY ? "OK" : "NÃO DEFINIDA");

app.listen(PORT, () => {
  console.log(`🚀 InclusivAula rodando na porta ${PORT}`);
});