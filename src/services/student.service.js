import { supabase } from "../config/supabase.js";

// ✅ criar aluno
export const createStudent = async (studentData) => {

  const { data, error } = await supabase
    .from("students")
    .insert([studentData])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ listar alunos
export const getStudents = async () => {

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar aluno por id
export const getStudentById = async (id) => {

  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ atualizar aluno
export const updateStudent = async (id, studentData) => {

  const { data, error } = await supabase
    .from("students")
    .update(studentData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ deletar aluno
export const deleteStudent = async (id) => {

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};