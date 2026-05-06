export const runNexus7 = async (input) => {
  const contexto = interpretar(input);

  return gerarAula(contexto);
};

const interpretar = (input) => {
  return {
    ...input,
    estrategia: `Adaptado para ${input.deficiencia || "geral"}`
  };
};

const gerarAula = (ctx) => {
  return {
    titulo: `Aula sobre ${ctx.tema}`,
    estrategia: ctx.estrategia,
    atividades: [
      "Atividade visual",
      "Atividade prática",
      "Atividade interativa"
    ]
  };
};