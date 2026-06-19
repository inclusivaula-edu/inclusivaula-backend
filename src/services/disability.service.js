import { supabase } from "../config/supabase.js";
import { pickDisabilityFields } from "../utils/sanitize.js";

export const createDisability = async (body, schoolId) => {
  const disabilityData = {
    ...pickDisabilityFields(body),
    school_id: schoolId
  };

  const { data, error } = await supabase
    .from("student_disabilities")
    .insert([disabilityData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getDisabilities = async (schoolId) => {
  const { data, error } = await supabase
    .from("student_disabilities")
    .select(`*, students (*)`)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getDisabilityById = async (id, schoolId) => {
  const { data, error } = await supabase
    .from("student_disabilities")
    .select(`*, students (*)`)
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateDisability = async (id, body, schoolId) => {
  const updateData = pickDisabilityFields(body);

  const { data, error } = await supabase
    .from("student_disabilities")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteDisability = async (id, schoolId) => {
  const { error } = await supabase
    .from("student_disabilities")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) throw new Error(error.message);
  return true;
};
