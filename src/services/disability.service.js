import { supabase } from "../config/supabase.js";

// ✅ criar deficiência/adaptação
export const createDisability = async (dataInput) => {

  const { data, error } = await supabase
    .from("student_disabilities")
    .insert([dataInput])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ listar
export const getDisabilities = async () => {

  const { data, error } = await supabase
    .from("student_disabilities")
    .select(`
      *,
      students (*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar por id
export const getDisabilityById = async (id) => {

  const { data, error } = await supabase
    .from("student_disabilities")
    .select(`
      *,
      students (*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ atualizar
export const updateDisability = async (id, dataInput) => {

  const { data, error } = await supabase
    .from("student_disabilities")
    .update(dataInput)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ deletar
export const deleteDisability = async (id) => {

  const { error } = await supabase
    .from("student_disabilities")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};