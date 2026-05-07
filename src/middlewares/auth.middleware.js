import { supabase }
from "../config/supabase.js";

export const authMiddleware =
async (req, res, next) => {

  try {

    const authHeader =
      req.headers.authorization;

    if (!authHeader) {

      return res.status(401).json({
        success: false,
        error: "Token não enviado"
      });
    }

    const token =
      authHeader.split(" ")[1];

    // 🔥 usuário auth
    const {
      data: userData,
      error: userError
    } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {

      return res.status(401).json({
        success: false,
        error: "Token inválido"
      });
    }

    // 🔥 profile
    const {
      data: profile,
      error: profileError
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {

      return res.status(403).json({
        success: false,
        error: "Perfil não encontrado"
      });
    }

    // 🔥 injeta request
    req.user = userData.user;

    req.profile = profile;

    req.schoolId = profile.school_id;

    req.role = profile.role;

    next();

  } catch (error) {

    console.error(
      "❌ authMiddleware:",
      error.message
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};