import { supabase } from "../config/supabase.js";
import { pickClassFields } from "../utils/sanitize.js";

export const createClass = async (body, schoolId) => {
  const classData = {
    ...pickClassFields(body),
    school_id: schoolId
  };

  const { data, error } = await supabase
    .from("classes")
    .insert([classData])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const getClasses = async (schoolId) => {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

export const getClassById = async (id, schoolId) => {
  const { data, error } = await supabase
    .from("classes")
    .select("*")
    .eq("id", id)
    .eq("school_id", schoolId)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateClass = async (id, body, schoolId) => {
  const updateData = pickClassFields(body);

  const { data, error } = await supabase
    .from("classes")
    .update(updateData)
    .eq("id", id)
    .eq("school_id", schoolId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteClass = async (id, schoolId) => {
  const { error } = await supabase
    .from("classes")
    .delete()
    .eq("id", id)
    .eq("school_id", schoolId);

  if (error) throw new Error(error.message);
  return true;
};
