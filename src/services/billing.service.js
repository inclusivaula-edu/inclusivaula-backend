import { MercadoPagoConfig, PreApproval, PreApprovalPlan, Payment } from "mercadopago";
import { supabase } from "../config/supabase.js";

export const PLANS = {
  free: {
    value: 0,
    description: "InclusivAula Free",
    aulas_limite: 5,
    relatorios_limite: 1,
    professores_limite: 1
  },
  pro: {
    value: 49.00,
    description: "InclusivAula Pro — 100 aulas/mês por escola",
    aulas_limite: 100,
    relatorios_limite: 10,
    professores_limite: 10
  },
  enterprise: {
    value: 199.00,
    description: "InclusivAula Enterprise — Ilimitado",
    aulas_limite: -1,
    relatorios_limite: -1,
    professores_limite: -1
  }
};

function getMpClient() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Módulo de pagamento não configurado");
  return new MercadoPagoConfig({ accessToken: token });
}

// Cache de IDs de planos MP para evitar criar duplicatas
const planCache = {};

async function getOrCreateMpPlan(planKey) {
  if (planCache[planKey]) return planCache[planKey];

  const config = getMpClient();
  const planConfig = PLANS[planKey];
  const planApi = new PreApprovalPlan(config);

  const result = await planApi.create({
    body: {
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
    }
  });

  planCache[planKey] = result.id;
  return result.id;
}

export async function getCurrentPlan(schoolId) {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, aulas_limite, relatorios_limite, professores_limite, last_payment_at, updated_at")
    .eq("school_id", schoolId)
    .single();

  return data || {
    plan: "free",
    status: "active",
    aulas_limite: 5,
    relatorios_limite: 1,
    professores_limite: 1
  };
}

export async function createCheckout({ schoolId, plan, school, adminUser }) {
  const planConfig = PLANS[plan];
  if (!planConfig || plan === "free") throw new Error("Plano inválido para contratação");

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

  // Obtém ou cria o plano MP (PreApprovalPlan)
  const mpPlanId = await getOrCreateMpPlan(plan);

  // Cria a assinatura (PreApproval) — retorna init_point para o usuário pagar
  const subscription = await preApprovalApi.create({
    body: {
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
    }
  });

  // Persiste como pendente até webhook confirmar
  await supabase.from("subscriptions").upsert({
    school_id: schoolId,
    user_id: adminUser.id,
    plan,
    aulas_limite: planConfig.aulas_limite,
    relatorios_limite: planConfig.relatorios_limite,
    professores_limite: planConfig.professores_limite,
    status: "pending",
    mp_subscription_id: subscription.id,
    updated_at: new Date().toISOString()
  }, { onConflict: "school_id" });

  return {
    plan,
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

  // Pagamento avulso ou de assinatura aprovado
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

  // Mudança de status da assinatura
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
