import {
  getCurrentPlan,
  createCheckout,
  cancelSubscription,
  processWebhook,
  PLANS
} from "../services/billing.service.js";
import { supabase } from "../config/supabase.js";
import { internalError } from "../utils/sanitize.js";
import { timingSafeEqual } from "crypto";

export const getPlan = async (req, res) => {
  try {
    const current = await getCurrentPlan(req.schoolId);
    return res.json({
      success: true,
      data: {
        ...current,
        available_plans: {
          pro: { value: 49.00, aulas_limite: 100, relatorios_limite: 10, professores_limite: 10 },
          enterprise: { value: 199.00, aulas_limite: -1, relatorios_limite: -1, professores_limite: -1 }
        }
      }
    });
  } catch (error) {
    console.error("getPlan:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

export const subscribePlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ success: false, error: "Plano inválido. Use: pro ou enterprise" });
    }

    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .select("*")
      .eq("id", req.schoolId)
      .single();

    if (schoolError || !school) {
      return res.status(404).json({ success: false, error: "Escola não encontrada" });
    }

    const result = await createCheckout({
      schoolId: req.schoolId,
      plan,
      school,
      adminUser: req.user
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("subscribePlan:", error.message);
    const isConfig = error.message.includes("não configurado");
    return res.status(isConfig ? 503 : 500).json({
      success: false,
      error: isConfig ? error.message : internalError(error)
    });
  }
};

export const cancelPlan = async (req, res) => {
  try {
    await cancelSubscription(req.schoolId);
    return res.json({ success: true, message: "Assinatura cancelada. Plano revertido para Free." });
  } catch (error) {
    console.error("cancelPlan:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

// Endpoint sem authMiddleware — validado por token do Asaas
export const handleWebhook = async (req, res) => {
  try {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    const receivedToken = req.headers["asaas-access-token"] || req.headers["access-token"];

    if (!webhookToken || !receivedToken) {
      return res.status(401).end();
    }
    try {
      const a = Buffer.from(receivedToken);
      const b = Buffer.from(webhookToken);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return res.status(401).end();
      }
    } catch {
      return res.status(401).end();
    }

    const { event, payment, subscription } = req.body;
    if (!event) return res.status(400).end();

    await processWebhook(event, { payment, subscription });
    return res.status(200).end();
  } catch (error) {
    console.error("handleWebhook:", error.message);
    return res.status(500).end();
  }
};
