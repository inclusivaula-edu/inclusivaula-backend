import { supabase } from "../config/supabase.js";
import { pickTeacherFields } from "../utils/sanitize.js";

export const createTeacher = async (body, schoolId) => {
  const teacherData = {
    ...pickTeacherFields(body),
    school_id: schoolId
  };

  const { data, error } = await supabase
    .from("teachers")
    .insert([teacherData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getTeachers = async (schoolId) => {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getTeacherById = async (id, schoolId) => {
  const { data, error } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateTeacher = async (id, body, schoolId) => {
  const updateData = pickTeacherFields(body);

  const { data, error } = await supabase
    .from("teachers")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteTeacher = async (id, schoolId) => {
  const { error } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) throw new Error(error.message);
  return true;
};
