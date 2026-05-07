import { supabase } from "../config/supabase.js";

// ✅ criar frequência
export const createAttendance = async (attendanceData) => {

  const { data, error } = await supabase
    .from("attendance")
    .insert([attendanceData])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ listar frequências
export const getAttendance = async () => {

  const { data, error } = await supabase
    .from("attendance")
    .select(`
      *,
      students (*),
      classes (*)
    `)
    .order("attendance_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar frequência por id
export const getAttendanceById = async (id) => {

  const { data, error } = await supabase
    .from("attendance")
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

// ✅ atualizar frequência
export const updateAttendance = async (id, attendanceData) => {

  const { data, error } = await supabase
    .from("attendance")
    .update(attendanceData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ deletar frequência
export const deleteAttendance = async (id) => {

  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
};