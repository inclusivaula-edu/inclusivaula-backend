import { supabase } from "../config/supabase.js";

// ✅ criar professor
export const createTeacher = async (teacherData) => {

  const { data, error } = await supabase
    .from("teachers")
    .insert([teacherData])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ listar professores
export const getTeachers = async () => {

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar por id
export const getTeacherById = async (id) => {

  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ atualizar
export const updateTeacher = async (id, teacherData) => {

  const { data, error } = await supabase
    .from("teachers")
    .update(teacherData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ deletar
export const deleteTeacher = async (id) => {

  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};