import { supabase } from "../config/supabase.js";

const ASAAS_BASE = process.env.ASAAS_SANDBOX === "true"
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/v3";

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

async function asaasRequest(method, path, body) {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("Módulo de pagamento não configurado");

  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "access_token": apiKey
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.message || "Erro no gateway de pagamento";
    throw new Error(msg);
  }
  return data;
}

function nextDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
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

  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("asaas_customer_id, asaas_subscription_id")
    .eq("school_id", schoolId)
    .single();

  // Cria ou reutiliza cliente no Asaas
  let customerId = existingSub?.asaas_customer_id;
  if (!customerId) {
    const customer = await asaasRequest("POST", "/customers", {
      name: school.name,
      email: adminUser.email,
      cpfCnpj: school.cnpj?.replace(/\D/g, "") || undefined,
      mobilePhone: school.phone?.replace(/\D/g, "") || undefined,
      notificationDisabled: false
    });
    customerId = customer.id;
  }

  // Cancela assinatura anterior antes de criar nova
  if (existingSub?.asaas_subscription_id) {
    try {
      await asaasRequest("DELETE", `/subscriptions/${existingSub.asaas_subscription_id}`);
    } catch {
      // Ignora se já cancelada
    }
  }

  const asaasSub = await asaasRequest("POST", "/subscriptions", {
    customer: customerId,
    billingType: "PIX",
    value: planConfig.value,
    nextDueDate: nextDueDate(),
    cycle: "MONTHLY",
    description: planConfig.description,
    externalReference: schoolId
  });

  // Busca Pix do primeiro pagamento
  let pixQrCode = null, pixCode = null, invoiceUrl = null;
  const payments = await asaasRequest("GET", `/subscriptions/${asaasSub.id}/payments`);
  const firstPayment = payments.data?.[0];
  if (firstPayment?.id) {
    invoiceUrl = firstPayment.invoiceUrl;
    try {
      const pix = await asaasRequest("GET", `/payments/${firstPayment.id}/pixQrCode`);
      pixQrCode = pix.encodedImage;
      pixCode = pix.payload;
    } catch {
      // Pix ainda processando — retorna invoiceUrl como fallback
    }
  }

  // Persiste como pendente até webhook confirmar pagamento
  await supabase.from("subscriptions").upsert({
    school_id: schoolId,
    user_id: adminUser.id,
    plan,
    aulas_limite: planConfig.aulas_limite,
    relatorios_limite: planConfig.relatorios_limite,
    professores_limite: planConfig.professores_limite,
    status: "pending",
    asaas_customer_id: customerId,
    asaas_subscription_id: asaasSub.id,
    updated_at: new Date().toISOString()
  }, { onConflict: "school_id" });

  return { plan, value: planConfig.value, pixQrCode, pixCode, invoiceUrl };
}

export async function cancelSubscription(schoolId) {
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("asaas_subscription_id")
    .eq("school_id", schoolId)
    .single();

  if (sub?.asaas_subscription_id) {
    await asaasRequest("DELETE", `/subscriptions/${sub.asaas_subscription_id}`);
  }

  await supabase.from("subscriptions").upsert({
    school_id: schoolId,
    plan: "free",
    aulas_limite: 5,
    relatorios_limite: 1,
    professores_limite: 1,
    status: "active",
    asaas_subscription_id: null,
    updated_at: new Date().toISOString()
  }, { onConflict: "school_id" });
}

export async function processWebhook(event, payload) {
  const subscriptionId = payload.payment?.subscription || payload.subscription?.id;
  if (!subscriptionId) return;

  if (["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(event)) {
    await supabase.from("subscriptions")
      .update({
        status: "active",
        last_payment_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("asaas_subscription_id", subscriptionId);
    return;
  }

  if (event === "PAYMENT_OVERDUE") {
    await supabase.from("subscriptions")
      .update({ status: "overdue", updated_at: new Date().toISOString() })
      .eq("asaas_subscription_id", subscriptionId);
    return;
  }

  if (["SUBSCRIPTION_DELETED", "PAYMENT_DELETED"].includes(event)) {
    await supabase.from("subscriptions")
      .update({
        status: "canceled",
        plan: "free",
        aulas_limite: 5,
        relatorios_limite: 1,
        professores_limite: 1,
        asaas_subscription_id: null,
        updated_at: new Date().toISOString()
      })
      .eq("asaas_subscription_id", subscriptionId);
  }
}
