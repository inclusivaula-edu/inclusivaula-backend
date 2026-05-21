import { v4 as uuidv4 } from "uuid";
import { runNexus7 } from "../nexus7/nexus7.js";
import { supabase } from "../config/supabase.js";

export const createLessonJob = async (input) => {
  const id = uuidv4();

  // salva no banco
  await supabase.from("lessons").insert([
    {
      id,
      status: "processing",
      input,
      result: null
    }
  ]);

  console.log("🚀 JOB CRIADO:", id);

  // processamento assíncrono
  setTimeout(async () => {
    try {
      const result = await runNexus7(input);

      await supabase
        .from("lessons")
        .update({
          status: "completed",
          result
        })
        .eq("id", id);

      console.log("✅ JOB COMPLETO:", id);
    } catch (error) {
      console.error("❌ ERRO NO JOB:", error.message);

      await supabase
        .from("lessons")
        .update({
          status: "error",
          result: { error: error.message }
        })
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
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("❌ ERRO AO BUSCAR JOB:", error.message);
    return null;
  }

  return data?.[0] ?? null;
};

export const generatePDF = async (jobId) => {
  const job = await getJob(jobId);

  if (!job || !job.result) {
    return "PDF não disponível";
  }

  // (simples por enquanto - depois evoluímos pra PDF real)
  return `PDF da aula:\n\n${JSON.stringify(job.result, null, 2)}`;
};