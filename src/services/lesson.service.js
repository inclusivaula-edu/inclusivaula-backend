import { v4 as uuidv4 } from "uuid";
import { runNexus7 } from "../nexus7/nexus7.js";
import { supabase } from "../config/supabase.js";
import { verificarLimiteAula, incrementarAula, getUsoMensal } from "./usage.service.js";

// Lock em memória por usuário — previne race condition no controle de limites.
// Em deployments multi-instância, substituir por lock distribuído (Redis, etc.).
const processingLock = new Set();

export const createLessonJob = async (input) => {
  const id = uuidv4();
  const userId = input.user_id || null;
  const schoolId = input.school_id || null;

  if (userId) {
    if (processingLock.has(userId)) {
      throw new Error("Aguarde o processamento da aula anterior antes de gerar uma nova.");
    }

    const limite = await verificarLimiteAula(userId, schoolId);
    if (!limite.permitido) {
      throw new Error(limite.mensagem);
    }

    processingLock.add(userId);
  }

  const { error: insertError } = await supabase.from("lessons").insert([{
    id,
    status: "processing",
    input,
    result: null,
    user_id: userId,
    teacher_id: userId
  }]);

  if (insertError) {
    processingLock.delete(userId);
    console.error("ERRO AO INSERIR JOB:", insertError.message, insertError.details);
    throw new Error(insertError.message);
  }

  setTimeout(async () => {
    try {
      const result = await runNexus7(input);
      const { error: updateError } = await supabase
        .from("lessons")
        .update({ status: "completed", result })
        .eq("id", id);

      if (updateError) {
        console.error("ERRO AO ATUALIZAR JOB:", updateError.message);
      } else {
        if (userId) await incrementarAula(userId);
      }
    } catch (error) {
      console.error("ERRO NO JOB:", error.message);
      await supabase
        .from("lessons")
        .update({ status: "error", result: { error: "Falha ao gerar aula" } })
        .eq("id", id);
    } finally {
      processingLock.delete(userId);
    }
  }, 0);

  return { id };
};

// Cleanup de jobs presos em "processing" por mais de 10 minutos
const cleanupStuckJobs = async () => {
  const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  await supabase
    .from("lessons")
    .update({ status: "error", result: { error: "Tempo limite de processamento excedido" } })
    .eq("status", "processing")
    .lt("created_at", cutoff);
};
setInterval(cleanupStuckJobs, 5 * 60 * 1000);

export const getJob = async (id) => {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) {
    console.error("ERRO AO BUSCAR JOB:", error.message);
    return null;
  }
  return data?.[0] ?? null;
};

export const getLimiteInfo = async (userId, schoolId) => {
  return verificarLimiteAula(userId, schoolId);
};
