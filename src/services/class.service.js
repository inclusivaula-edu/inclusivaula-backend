import { supabase } from "../config/supabase.js";

// ✅ criar turma
export const createClass = async (classData) => {

  const { data, error } = await supabase
    .from("classes")
    .insert([classData])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ listar turmas
export const getClasses = async () => {

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar turma por id
export const getClassById = async (id) => {

  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ atualizar turma
export const updateClass = async (id, classData) => {

  const { data, error } = await supabase
    .from("classes")
    .update(classData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ deletar turma
export const deleteClass = async (id) => {

  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};