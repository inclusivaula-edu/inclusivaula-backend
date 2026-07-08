import { v4 as uuidv4 } from "uuid";
import { runNexus7Simulado } from "../nexus7/nexus7-simulado.js";
import { supabase } from "../config/supabase.js";

const processingLock = new Set();

export const createSimuladoJob = async (input) => {
  const id = uuidv4();
  const userId = input.user_id;
  const schoolId = input.school_id;

  if (processingLock.has(userId)) {
    throw new Error("Aguarde o processamento do simulado anterior.");
  }
  processingLock.add(userId);

  const { disciplinas, grade, periodo, questoes_por_disciplina, tipos_questao, student_id, class_id } = input;

  const { error: insertError } = await supabase.from("simulados").insert([{
    id,
    school_id: schoolId,
    teacher_id: userId,
    class_id: class_id || null,
    grade,
    periodo,
    disciplinas,
    questoes_por_disciplina: questoes_por_disciplina || 5,
    tipos_questao: tipos_questao || ["multipla_escolha"],
    student_id: student_id || null,
    status: "processing",
    input,
    result: null
  }]);

  if (insertError) {
    processingLock.delete(userId);
    throw new Error(insertError.message);
  }

  setTimeout(() => {
    processSimuladoJob(id, input).finally(() => processingLock.delete(userId));
  }, 0);

  return { id };
};

// Processa (ou reprocessa) um simulado. Usado na criação e na
// recuperação de jobs órfãos após restart do servidor.
export const processSimuladoJob = async (id, input) => {
  const { disciplinas, grade, periodo, questoes_por_disciplina, tipos_questao, student_id, school_id: schoolId } = input;
  try {
    const { data: aulas } = await supabase
      .from("lessons")
      .select("id, disciplina, input, result")
      .eq("school_id", schoolId)
      .eq("status", "completed")
      .eq("grade", grade)
      .in("disciplina", disciplinas)
      .order("created_at", { ascending: false })
      .limit(50);

    let student = null;
    if (student_id) {
      const { data: s } = await supabase
        .from("students")
        .select("id, full_name, disability_type, observable_behavior, what_helps, notes")
        .eq("id", student_id)
        .single();
      student = s;
    }

    const result = await runNexus7Simulado({
      disciplinas,
      grade,
      periodo,
      questoes_por_disciplina: questoes_por_disciplina || 5,
      tipos_questao: tipos_questao || ["multipla_escolha"],
      aulasContexto: aulas || [],
      student
    });

    await supabase
      .from("simulados")
      .update({ status: "completed", result })
      .eq("id", id);
  } catch (error) {
    console.error("ERRO SIMULADO:", error.message, error.stack);
    await supabase
      .from("simulados")
      .update({ status: "error", result: { error: "Falha ao gerar simulado", debug: error.message } })
      .eq("id", id);
  }
};

export const getSimulado = async (id) => {
  const { data, error } = await supabase
    .from("simulados")
    .select("*")
    .eq("id", id)
    .limit(1);

  if (error) return null;
  return data?.[0] ?? null;
};

export const listSimulados = async (schoolId, teacherId) => {
  const { data, error } = await supabase
    .from("simulados")
    .select("id, grade, periodo, disciplinas, status, student_id, created_at, result->titulo")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return data;
};
