import { supabase } from "../config/supabase.js";

export const getSchoolAggregates = async () => {

  const { data: schools } = await supabase
    .from("schools")
    .select("*");

  const results = [];

  for (const school of schools) {

    const { data: students } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", school.id);

    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("*")
      .eq("school_id", school.id);

    results.push({
      school: school.name,
      students: students?.length || 0,
      evaluations: evaluations?.length || 0
    });
  }

  return results;
};