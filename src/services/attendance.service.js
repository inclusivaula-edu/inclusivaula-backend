import { supabase } from "../config/supabase.js";
import { pickAttendanceFields } from "../utils/sanitize.js";

export const createAttendance = async (body, schoolId) => {
  const attendanceData = {
    ...pickAttendanceFields(body),
    school_id: schoolId
  };

  const { data, error } = await supabase
    .from("attendance")
    .insert([attendanceData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getAttendance = async (schoolId) => {
  const { data, error } = await supabase
    .from("attendance")
    .select(`*, students (*), classes (*)`)
    .eq("school_id", schoolId)
    .order("attendance_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getAttendanceById = async (id, schoolId) => {
  const { data, error } = await supabase
    .from("attendance")
    .select(`*, students (*), classes (*)`)
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateAttendance = async (id, body, schoolId) => {
  const updateData = pickAttendanceFields(body);

  const { data, error } = await supabase
    .from("attendance")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteAttendance = async (id, schoolId) => {
  const { error } = await supabase
    .from("attendance")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) throw new Error(error.message);
  return true;
};
