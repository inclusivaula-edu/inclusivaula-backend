import express from "express";
import { supabase } from "../config/supabase.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { secureMiddleware } from "../middlewares/secure.middleware.js";
import { internalError, sanitizeForPrompt } from "../utils/sanitize.js";

const router = express.Router();

// Lista agendamentos do professor (futuros por padrão; ?todos=true inclui passados)
router.get("/agenda", authMiddleware, secureMiddleware, async (req, res) => {
  try {
    let query = supabase.from("aee_appointments")
      .select("*")
      .eq("school_id", req.schoolId)
      .order("data_hora", { ascending: true })
      .limit(200);

    if (req.query.todos !== "true") {
      query = query.gte("data_hora", new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString());
    }
    if (req.query.student_id) query = query.eq("student_id", req.query.student_id);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return res.json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

// Cria agendamento
router.post("/agenda", authMiddleware, secureMiddleware, async (req, res) => {
  try {
    const { student_id, data_hora, duracao_minutos, tipo_agrupamento, observacao } = req.body;
    if (!student_id || !data_hora) {
      return res.status(400).json({ success: false, error: "student_id e data_hora são obrigatórios" });
    }
    if (new Date(data_hora) < new Date()) {
      return res.status(400).json({ success: false, error: "O agendamento deve ser no futuro" });
    }

    const { data: aluno } = await supabase.from("students")
      .select("id, school_id").eq("id", student_id).single();
    if (!aluno || (aluno.school_id && aluno.school_id !== req.schoolId)) {
      return res.status(403).json({ success: false, error: "Aluno não encontrado na sua escola" });
    }

    const { data, error } = await supabase.from("aee_appointments").insert([{
      student_id,
      school_id: req.schoolId,
      user_id: req.user.id,
      data_hora,
      duracao_minutos: Math.min(Math.max(Number(duracao_minutos) || 50, 10), 240),
      tipo_agrupamento: tipo_agrupamento || "individual",
      observacao: observacao ? sanitizeForPrompt(observacao) : null
    }]).select().single();

    if (error) throw new Error(error.message);
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

// Atualiza status (realizado/cancelado) ou reagenda
router.patch("/agenda/:id", authMiddleware, secureMiddleware, async (req, res) => {
  try {
    const { data: existing } = await supabase.from("aee_appointments")
      .select("id, user_id, school_id").eq("id", req.params.id).single();
    if (!existing) return res.status(404).json({ success: false, error: "Agendamento não encontrado" });
    if (existing.school_id !== req.schoolId) {
      return res.status(403).json({ success: false, error: "Acesso negado" });
    }

    const campos = {};
    if (req.body.status && ["agendado", "realizado", "cancelado"].includes(req.body.status)) {
      campos.status = req.body.status;
    }
    if (req.body.data_hora) {
      campos.data_hora = req.body.data_hora;
      campos.lembrete_enviado = false; // reagendou → novo lembrete
    }
    if (req.body.observacao !== undefined) campos.observacao = sanitizeForPrompt(req.body.observacao || "");
    if (Object.keys(campos).length === 0) {
      return res.status(400).json({ success: false, error: "Nada para atualizar" });
    }

    const { data, error } = await supabase.from("aee_appointments")
      .update(campos).eq("id", req.params.id).select().single();
    if (error) throw new Error(error.message);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

// Exclui agendamento
router.delete("/agenda/:id", authMiddleware, secureMiddleware, async (req, res) => {
  try {
    const { error } = await supabase.from("aee_appointments")
      .delete().eq("id", req.params.id).eq("school_id", req.schoolId);
    if (error) throw new Error(error.message);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: internalError(error) });
  }
});

export default router;
