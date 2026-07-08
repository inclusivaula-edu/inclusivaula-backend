import { supabase } from "../config/supabase.js";
import { processLessonJob } from "./lesson.service.js";
import { processSimuladoJob } from "./simulado.service.js";
import { runNexus7PEI } from "../nexus7/nexus7-pei.js";
import { runNexus7AEE } from "../nexus7/nexus7-aee.js";

const LIMITE_POR_TIPO = 10;

/**
 * Recuperação de jobs órfãos: se o servidor reiniciar no meio de uma geração,
 * o job fica preso em "processing" para sempre (até o cleanup marcá-lo como erro).
 * No boot, retomamos esses jobs — o professor recebe o resultado em vez de uma falha.
 */
export async function recoverOrphanJobs() {
  try {
    await Promise.all([
      recoverLessons(),
      recoverSimulados(),
      recoverDocumentos("pei_documents", runNexus7PEI, "PEI"),
      recoverDocumentos("aee_documents", runNexus7AEE, "AEE")
    ]);
  } catch (err) {
    console.error("Job recovery error:", err.message);
  }
}

async function recoverLessons() {
  const { data } = await supabase
    .from("lessons").select("id, input")
    .eq("status", "processing")
    .limit(LIMITE_POR_TIPO);

  for (const job of data || []) {
    if (!job.input) continue;
    console.log(`♻️ Recuperando aula órfã ${job.id}`);
    processLessonJob(job.id, job.input);
  }
}

async function recoverSimulados() {
  const { data } = await supabase
    .from("simulados").select("id, input")
    .eq("status", "processing")
    .limit(LIMITE_POR_TIPO);

  for (const job of data || []) {
    if (!job.input) continue;
    console.log(`♻️ Recuperando simulado órfão ${job.id}`);
    processSimuladoJob(job.id, job.input);
  }
}

// PEI e AEE não guardam o input completo — reconstruímos a partir da linha + aluno
async function recoverDocumentos(tabela, runAgent, label) {
  const { data } = await supabase
    .from(tabela).select("id, student_id, periodo, user_id")
    .eq("status", "processing")
    .limit(LIMITE_POR_TIPO);

  for (const job of data || []) {
    console.log(`♻️ Recuperando ${label} órfão ${job.id}`);
    reprocessarDocumento(tabela, runAgent, label, job);
  }
}

async function reprocessarDocumento(tabela, runAgent, label, job) {
  try {
    const { data: student } = await supabase
      .from("students")
      .select("full_name, grade, disability_type, notes, guardian_name, school_id")
      .eq("id", job.student_id)
      .single();

    if (!student) throw new Error("Aluno não encontrado na recuperação");

    const { data: profile } = await supabase
      .from("profiles").select("full_name").eq("id", job.user_id).maybeSingle();

    const result = await runAgent({
      student,
      periodo: job.periodo || "",
      escola: "",
      teacher: profile?.full_name || ""
    });

    await supabase.from(tabela)
      .update({ status: "completed", result })
      .eq("id", job.id);
  } catch (err) {
    console.error(`ERRO recuperação ${label}:`, err.message);
    await supabase.from(tabela)
      .update({ status: "error", result: { error: `Falha ao gerar ${label}` } })
      .eq("id", job.id);
  }
}
