import {
  getCurrentPlan,
  createCheckout,
  cancelSubscription,
  processWebhook,
  PLANS
} from "../services/billing.service.js";
import { supabase } from "../config/supabase.js";
import { internalError } from "../utils/sanitize.js";
import { createHmac, timingSafeEqual } from "crypto";

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

// Validação de webhook do Mercado Pago via HMAC-SHA256
function validateMpSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return false;

  const xSignature = req.headers["x-signature"] || "";
  const xRequestId = req.headers["x-request-id"] || "";
  const { id: dataId } = req.query;

  // Formato: ts=<timestamp>,v1=<hmac>
  const parts = Object.fromEntries(
    xSignature.split(",").map(p => p.split("="))
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Endpoint sem authMiddleware — validado por assinatura MP
export const handleWebhook = async (req, res) => {
  try {
    // Sempre responder 200 rapidamente para o MP não retentar
    if (!validateMpSignature(req)) {
      return res.status(401).end();
    }

    const { type, action, data } = req.body;
    const resourceId = data?.id || req.query.id;

    if (!type || !resourceId) return res.status(200).end();

    // type: "payment" | "preapproval"
    await processWebhook(type, resourceId);
    return res.status(200).end();
  } catch (error) {
    console.error("handleWebhook:", error.message);
    return res.status(500).end();
  }
};
