import { MercadoPagoConfig, PreApproval, PreApprovalPlan, Payment } from "mercadopago";
import { supabase } from "../config/supabase.js";

// Catálogo de planos: plan + cycle → config completa
export const PLAN_CATALOG = {
  pro: {
    label: "Pro Individual",
    professores_limite: 1,
    aulas_limite: 100,
    relatorios_limite: 10,
    cycles: {
      mensal:    { value: 49.90,  repetitions: null, description: "InclusivAula Pro — mensal" },
      semestral: { value: 44.90,  repetitions: 6,    description: "InclusivAula Pro — semestral (6x)" },
      anual:     { value: 39.90,  repetitions: 12,   description: "InclusivAula Pro — anual (12x)" }
    }
  },
  escola_mini: {
    label: "Escola Mini",
    professores_limite: 10,
    aulas_limite: -1,
    relatorios_limite: -1,
    cycles: {
      mensal:    { value: 299.00, repetitions: null, description: "InclusivAula Escola Mini — mensal" },
      semestral: { value: 269.00, repetitions: 6,    description: "InclusivAula Escola Mini — semestral (6x)" },
      anual:     { value: 239.00, repetitions: 12,   description: "InclusivAula Escola Mini — anual (12x)" }
    }
  },
  escola_standard: {
    label: "Escola Standard",
    professores_limite: 25,
    aulas_limite: -1,
    relatorios_limite: -1,
    cycles: {
      mensal:    { value: 798.00, repetitions: null, description: "InclusivAula Escola Standard — mensal" },
      semestral: { value: 718.00, repetitions: 6,    description: "InclusivAula Escola Standard — semestral (6x)" },
      anual:     { value: 638.00, repetitions: 12,   description: "InclusivAula Escola Standard — anual (12x)" }
    }
  },
  premium: {
    label: "Premium",
    professores_limite: 50,
    aulas_limite: -1,
    relatorios_limite: -1,
    cycles: {
      mensal:    { value: 2499.00, repetitions: null, description: "InclusivAula Premium — mensal" },
      semestral: { value: 2249.00, repetitions: 6,    description: "InclusivAula Premium — semestral (6x)" },
      anual:     { value: 1999.00, repetitions: 12,   description: "InclusivAula Premium — anual (12x)" }
    }
  }
};

// Planos legados (manter compatibilidade com assinaturas antigas)
export const PLANS = {
  free: { value: 0, aulas_limite: 5, relatorios_limite: 1, professores_limite: 1 },
  pro: { value: 49.00, aulas_limite: 100, relatorios_limite: 10, professores_limite: 10 },
  enterprise: { value: 199.00, aulas_limite: -1, relatorios_limite: -1, professores_limite: -1 }
};

export function getPlanConfig(plan, cycle = "mensal") {
  const planDef = PLAN_CATALOG[plan];
  if (!planDef) return null;
  const cycleDef = planDef.cycles[cycle];
  if (!cycleDef) return null;
  return {
    ...cycleDef,
    professores_limite: planDef.professores_limite,
    aulas_limite: planDef.aulas_limite,
    relatorios_limite: planDef.relatorios_limite,
    label: planDef.label
  };
}

function getMpClient() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Módulo de pagamento não configurado");
  return new MercadoPagoConfig({ accessToken: token });
}

// Cache de IDs de PreApprovalPlan no MP para evitar duplicatas
const planCache = {};

async function getOrCreateMpPlan(plan, cycle) {
  const cacheKey = `${plan}_${cycle}`;
  if (planCache[cacheKey]) return planCache[cacheKey];

  const config = getMpClient();
  const planConfig = getPlanConfig(plan, cycle);
  const planApi = new PreApprovalPlan(config);

  const body = {
    reason: planConfig.description,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: planConfig.value,
      currency_id: "BRL"
    },
    payment_methods_allowed: {
      payment_types: [{ id: "credit_card" }, { id: "debit_card" }]
    },
    back_url: `${process.env.FRONTEND_URL || "https://www.inclusivaula.com.br"}/dashboard`
  };

  // Planos com fidelidade: limita o número de cobranças
  if (planConfig.repetitions) {
    body.auto_recurring.repetitions = planConfig.repetitions;
  }

  const result = await planApi.create({ body });
  planCache[cacheKey] = result.id;
  return result.id;
}

export async function getCurrentPlan(schoolId) {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, cycle, status, aulas_limite, relatorios_limite, professores_limite, last_payment_at, updated_at")
    .eq("school_id", schoolId)
    .single();

  return data || {
    plan: "free",
    cycle: null,
    status: "active",
    aulas_limite: 5,
    relatorios_limite: 1,
    professores_limite: 1
  };
}

export async function createCheckout({ schoolId, plan, cycle = "mensal", school, adminUser }) {
  const planConfig = getPlanConfig(plan, cycle);
  if (!planConfig) throw new Error("Plano ou ciclo inválido");

  const config = getMpClient();
  const preApprovalApi = new PreApproval(config);
  const frontendUrl = process.env.FRONTEND_URL || "https://www.inclusivaula.com.br";

  // Cancela assinatura anterior se existir
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("mp_subscription_id")
    .eq("school_id", schoolId)
    .single();

  if (existingSub?.mp_subscription_id) {
    try {
      await preApprovalApi.update({
        id: existingSub.mp_subscription_id,
        body: { status: "cancelled" }
      });
    } catch {
      // Ignora se já cancelada
    }
  }

  const mpPlanId = await getOrCreateMpPlan(plan, cycle);

  const subBody = {
    preapproval_plan_id: mpPlanId,
    reason: planConfig.description,
    payer_email: adminUser.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: planConfig.value,
      currency_id: "BRL"
    },
    back_url: `${frontendUrl}/dashboard`,
    external_reference: schoolId,
    status: "pending"
  };

  if (planConfig.repetitions) {
    subBody.auto_recurring.repetitions = planConfig.repetitions;
  }

  const subscription = await preApprovalApi.create({ body: subBody });

  await supabase.from("subscriptions").upsert({
    school_id: schoolId,
    user_id: adminUser.id,
    plan,
    cycle,
    aulas_limite: planConfig.aulas_limite,
    relatorios_limite: planConfig.relatorios_limite,
    professores_limite: planConfig.professores_limite,
    status: "pending",
    mp_subscription_id: subscription.id,
    updated_at: new Date().toISOString()
  }, { onConflict: "school_id" });

  return {
    plan,
    cycle,
    value: planConfig.value,
    checkoutUrl: subscription.init_point,
    subscriptionId: subscription.id
  };
}

export async function cancelSubscription(schoolId) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("mp_subscription_id")
    .eq("school_id", schoolId)
    .single();

  if (sub?.mp_subscription_id) {
    const config = getMpClient();
    const preApprovalApi = new PreApproval(config);
    try {
      await preApprovalApi.update({
        id: sub.mp_subscription_id,
        body: { status: "cancelled" }
      });
    } catch {
      // Continua mesmo se já cancelada no MP
    }
  }

  await supabase.from("subscriptions").upsert({
    school_id: schoolId,
    plan: "free",
    cycle: null,
    aulas_limite: 5,
    relatorios_limite: 1,
    professores_limite: 1,
    status: "active",
    mp_subscription_id: null,
    updated_at: new Date().toISOString()
  }, { onConflict: "school_id" });
}

export async function processWebhook(topic, resourceId) {
  if (!topic || !resourceId) return;

  if (topic === "payment") {
    const config = getMpClient();
    const paymentApi = new Payment(config);
    let payment;
    try {
      payment = await paymentApi.get({ id: resourceId });
    } catch {
      return;
    }

    const externalRef = payment.external_reference;
    const status = payment.status;

    if (status === "approved" && externalRef) {
      await supabase.from("subscriptions")
        .update({
          status: "active",
          mp_payment_id: String(resourceId),
          last_payment_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("school_id", externalRef);
    }
    return;
  }

  if (topic === "preapproval") {
    const config = getMpClient();
    const preApprovalApi = new PreApproval(config);
    let sub;
    try {
      sub = await preApprovalApi.get({ id: resourceId });
    } catch {
      return;
    }

    const mpStatus = sub.status;
    const externalRef = sub.external_reference;
    if (!externalRef) return;

    if (mpStatus === "authorized") {
      await supabase.from("subscriptions")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("school_id", externalRef);
    } else if (["cancelled", "paused"].includes(mpStatus)) {
      await supabase.from("subscriptions")
        .update({
          status: "canceled",
          plan: "free",
          cycle: null,
          aulas_limite: 5,
          relatorios_limite: 1,
          professores_limite: 1,
          mp_subscription_id: null,
          updated_at: new Date().toISOString()
        })
        .eq("school_id", externalRef);
    }
  }
}
