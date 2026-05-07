import { supabase } from "../config/supabase.js";

// ✅ criar avaliação
export const createEvaluation = async (evaluationData) => {

  const { data, error } = await supabase
    .from("evaluations")
    .insert([evaluationData])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ listar avaliações
export const getEvaluations = async () => {

  const { data, error } = await supabase
    .from("evaluations")
    .select(`
      *,
      students (*),
      classes (*)
    `)
    .order("evaluation_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar avaliação por id
export const getEvaluationById = async (id) => {

  const { data, error } = await supabase
    .from("evaluations")
    .select(`
      *,
      students (*),
      classes (*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ atualizar avaliação
export const updateEvaluation = async (id, evaluationData) => {

  const { data, error } = await supabase
    .from("evaluations")
    .update(evaluationData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ deletar avaliação
export const deleteEvaluation = async (id) => {

  const { error } = await supabase
    .from("evaluations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};