import { supabase }
from "../config/supabase.js";

// ✅ salvar memória
export const saveMemory = async ({
  schoolId,
  studentId,
  type,
  content,
  metadata = {}
}) => {

  const { data, error } =
    await supabase
      .from("memory_logs")
      .insert([
        {
          school_id: schoolId,
          student_id: studentId,
          type,
          content,
          metadata
        }
      ])
      .select()
      .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
};

// ✅ buscar memória aluno
export const getStudentMemories =
async (studentId) => {

  const { data, error } =
    await supabase
      .from("memory_logs")
      .select("*")
      .eq("student_id", studentId)
      .order("created_at", {
        ascending: false
      });

  if (error) {
    throw new Error(error.message);
  }

  return data;
};