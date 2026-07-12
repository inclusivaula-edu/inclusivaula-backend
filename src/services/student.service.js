import { supabase } from "../config/supabase.js";
import { pickStudentFields } from "../utils/sanitize.js";

const ROLES_VEEM_TODOS = ["coordenador", "diretor", "secretaria", "mec"];

export const createStudent = async (body, schoolId, userId = null) => {
  const studentData = {
    ...pickStudentFields(body),
    school_id: schoolId,
    created_by: userId
  };

  const { data, error } = await supabase
    .from("students")
    .insert([studentData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getStudents = async (schoolId, { userId = null, role = null } = {}) => {
  let query = supabase
    .from("students")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  // Professor comum vê apenas os alunos que ele mesmo cadastrou
  if (userId && role && !ROLES_VEEM_TODOS.includes(role)) {
    query = query.eq("created_by", userId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getStudentById = async (id, schoolId) => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateStudent = async (id, body, schoolId) => {
  const updateData = pickStudentFields(body);

  const { data, error } = await supabase
    .from("students")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteStudent = async (id, schoolId) => {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) throw new Error(error.message);
  return true;
};
