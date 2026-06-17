import { v4 as uuidv4 } from "uuid";
import { runNexus7 } from "../nexus7/nexus7.js";
import { supabase } from "../config/supabase.js";

export const createLessonJob = async (input) => {
  const id = uuidv4();

  // Extrai user_id do input para salvar na coluna real
  // Necessário para que o RLS (user_id = auth.uid()) funcione corretamente
  const userId = input.user_id || null;

  const { error: insertError } = await supabase.from("lessons").insert([{
    id,
    status: "processing",
    input,
    result: null,
    user_id: userId,
    teacher_id: userId
  }]);

  if (insertError) {
    console.error("❌ ERRO AO INSERIR JOB:", insertError.message, insertError.details);
    throw new Error(insertError.message);
  }

  console.log("🚀 JOB CRIADO:", id, "user_id:", userId);

  // Processa a aula de forma assíncrona
  setTimeout(async () => {
    try {
      const result = await runNexus7(input);
      const { error: updateError } = await supabase
        .from("lessons")
        .update({ status: "completed", result })
        .eq("id", id);
      if (updateError) {
        console.error("❌ ERRO AO ATUALIZAR JOB:", updateError.message);
      }
      console.log("✅ JOB COMPLETO:", id);
    } catch (error) {
      console.error("❌ ERRO NO JOB:", error.message);
      await supabase
        .from("lessons")
        .update({ status: "error", result: { error: error.message } })
        .eq("id", id);
    }
  }, 2000);

  return { id };
};

export const getJob = async (id) => {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) {
    console.error("❌ ERRO AO BUSCAR JOB:", error.message);
    return null;
  }
  return data?.[0] ?? null;
};

export const generatePDF = async (jobId) => {
  const job = await getJob(jobId);
  if (!job || !job.result) return "PDF não disponível";
  return `PDF da aula:\n\n${JSON.stringify(job.result, null, 2)}`;
};