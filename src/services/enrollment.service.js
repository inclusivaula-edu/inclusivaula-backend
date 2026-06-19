import { supabase } from "../config/supabase.js";
import { pickEnrollmentFields } from "../utils/sanitize.js";

export const createEnrollment = async (body, schoolId) => {
  const enrollmentData = {
    ...pickEnrollmentFields(body),
    school_id: schoolId
  };

  const { data, error } = await supabase
    .from("enrollments")
    .insert([enrollmentData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getEnrollments = async (schoolId) => {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`*, students (*), classes (*)`)
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getEnrollmentById = async (id, schoolId) => {
  const { data, error } = await supabase
    .from("enrollments")
    .select(`*, students (*), classes (*)`)
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteEnrollment = async (id, schoolId) => {
  const { error } = await supabase
    .from("enrollments")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) throw new Error(error.message);
  return true;
};
