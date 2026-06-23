import { supabase } from "../config/supabase.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Token não enviado"
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token não enviado"
      });
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({
        success: false,
        error: "Token inválido ou expirado"
      });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, school_id, full_name, email")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        error: "Perfil não encontrado"
      });
    }

    req.user = userData.user;
    req.profile = profile;
    req.schoolId = profile.school_id;
    req.role = profile.role;

    next();
  } catch (error) {
    console.error("authMiddleware error:", error.message);
    return res.status(401).json({
      success: false,
      error: "Não autenticado"
    });
  }
};
