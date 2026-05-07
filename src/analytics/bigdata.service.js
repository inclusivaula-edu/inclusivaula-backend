import { supabase } from "../config/supabase.js";

// 🔥 coleta dados de TODAS as escolas
export const getGlobalEducationData = async () => {

  const { data: students } = await supabase
    .from("students")
    .select("*");

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("*");

  const { data: attendance } = await supabase
    .from("attendance")
    .select("*");

  const { data: disabilities } = await supabase
    .from("student_disabilities")
    .select("*");

  return {
    students: students || [],
    evaluations: evaluations || [],
    attendance: attendance || [],
    disabilities: disabilities || []
  };
};