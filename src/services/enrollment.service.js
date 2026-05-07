import { supabase } from "../config/supabase.js";

// ✅ criar matrícula
export const createEnrollment = async (enrollmentData) => {

  const { data, error } = await supabase
    .from("enrollments")
    .insert([enrollmentData])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ listar matrículas
export const getEnrollments = async () => {

  const { data, error } = await supabase
    .from("enrollments")
    .select(`
      *,
      students (*),
      classes (*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar matrícula por id
export const getEnrollmentById = async (id) => {

  const { data, error } = await supabase
    .from("enrollments")
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

// ✅ deletar matrícula
export const deleteEnrollment = async (id) => {

  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};