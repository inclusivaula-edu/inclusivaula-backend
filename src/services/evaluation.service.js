import { supabase } from "../config/supabase.js";
import { pickEvaluationFields } from "../utils/sanitize.js";

export const createEvaluation = async (body, schoolId) => {
  const evaluationData = {
    ...pickEvaluationFields(body),
    school_id: schoolId
  };

  const { data, error } = await supabase
    .from("evaluations")
    .insert([evaluationData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getEvaluations = async (schoolId) => {
  const { data, error } = await supabase
    .from("evaluations")
    .select(`*, students (*), classes (*)`)
    .eq("school_id", schoolId)
    .order("evaluation_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getEvaluationById = async (id, schoolId) => {
  const { data, error } = await supabase
    .from("evaluations")
    .select(`*, students (*), classes (*)`)
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateEvaluation = async (id, body, schoolId) => {
  const updateData = pickEvaluationFields(body);

  const { data, error } = await supabase
    .from("evaluations")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteEvaluation = async (id, schoolId) => {
  const { error } = await supabase
    .from("evaluations")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) throw new Error(error.message);
  return true;
};
