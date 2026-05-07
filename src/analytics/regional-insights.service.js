import { supabase } from "../config/supabase.js";

export const getRegionalInsights = async () => {

  const { data: schools } = await supabase
    .from("schools")
    .select("*");

  const insights = [];

  if (schools.length > 10) {

    insights.push(
      "Rede escolar extensa detectada: possível padronização pedagógica recomendada."
    );
  }

  return {
    totalSchools: schools.length,
    insights
  };
};