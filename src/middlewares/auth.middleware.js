import { supabase } from "../config/supabase.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 🔒 verifica se enviou token
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: "Token não enviado"
      });
    }

    // 🔑 formato esperado:
    // Authorization: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token mal formatado"
      });
    }

    // 🔍 valida usuário no Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        error: "Token inválido"
      });
    }

    // 👤 usuário autenticado disponível nas rotas
    req.user = data.user;

    console.log("✅ Usuário autenticado:", data.user.email);

    next();

  } catch (error) {
    console.error("❌ ERRO AUTH:", error.message);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};