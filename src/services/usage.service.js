import { supabase } from "../config/supabase.js";

// Retorna o mês atual no formato "2026-06"
function getMesAtual() {
  return new Date().toISOString().slice(0, 7);
}

// Busca o plano da escola (prefere school_id, cai em user_id para compat retroativa)
export const getPlano = async (userId, schoolId) => {
  if (schoolId) {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, aulas_limite, relatorios_limite, professores_limite, status")
      .eq("school_id", schoolId)
      .in("status", ["active", "overdue"])
      .single();
    if (data) return data;
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, aulas_limite, relatorios_limite, professores_limite, status")
    .eq("user_id", userId)
    .in("status", ["active", "overdue"])
    .single();

  return data || {
    plan: "free",
    aulas_limite: 20,
    relatorios_limite: 10,
    professores_limite: 1,
    status: "active"
  };
};

// Busca o uso do mês atual — cria o registro se não existir
export const getUsoMensal = async (userId, schoolId) => {
  const mes = getMesAtual();

  const { data: existing } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("user_id", userId)
    .eq("mes", mes)
    .single();

  if (existing) return existing;

  // Cria registro de uso zerado para o mês atual
  const { data: novo } = await supabase
    .from("usage_tracking")
    .insert([{ user_id: userId, school_id: schoolId, mes, aulas_geradas: 0, relatorios_gerados: 0 }])
    .select()
    .single();

  return novo || { aulas_geradas: 0, relatorios_gerados: 0 };
};

// Verifica se o usuário pode gerar uma aula
export const verificarLimiteAula = async (userId, schoolId) => {
  const [plano, uso] = await Promise.all([
    getPlano(userId, schoolId),
    getUsoMensal(userId, schoolId)
  ]);

  // -1 significa ilimitado
  if (plano.aulas_limite === -1) return { permitido: true, plano, uso };

  const permitido = uso.aulas_geradas < plano.aulas_limite;
  return {
    permitido,
    plano,
    uso,
    restantes: Math.max(0, plano.aulas_limite - uso.aulas_geradas),
    mensagem: permitido ? null : `Limite de ${plano.aulas_limite} aulas por mês atingido. Faça upgrade para continuar.`
  };
};

// Verifica se o usuário pode gerar um relatório
export const verificarLimiteRelatorio = async (userId, schoolId) => {
  const [plano, uso] = await Promise.all([
    getPlano(userId, schoolId),
    getUsoMensal(userId, schoolId)
  ]);

  if (plano.relatorios_limite === -1) return { permitido: true, plano, uso };

  const permitido = uso.relatorios_gerados < plano.relatorios_limite;
  return {
    permitido,
    plano,
    uso,
    restantes: Math.max(0, plano.relatorios_limite - uso.relatorios_gerados),
    mensagem: permitido ? null : `Limite de ${plano.relatorios_limite} relatório(s) por mês atingido. Faça upgrade para continuar.`
  };
};

// Incrementa o contador de aulas geradas
export const incrementarAula = async (userId) => {
  const mes = getMesAtual();
  await supabase.rpc("incrementar_uso", {
    p_user_id: userId,
    p_mes: mes,
    p_campo: "aulas_geradas"
  });
};

// Incrementa o contador de relatórios gerados
export const incrementarRelatorio = async (userId) => {
  const mes = getMesAtual();
  await supabase.rpc("incrementar_uso", {
    p_user_id: userId,
    p_mes: mes,
    p_campo: "relatorios_gerados"
  });
};