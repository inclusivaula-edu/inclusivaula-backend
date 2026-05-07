export const forecastPerformance = (history) => {

  if (!history || history.length < 3) {
    return {
      forecast: "INSUFFICIENT_DATA"
    };
  }

  const lastScores = history.slice(-3);

  const trend =
    lastScores[2] - lastScores[0];

  let prediction = "STABLE";

  if (trend < -1) prediction = "DECLINE";
  if (trend > 1) prediction = "IMPROVEMENT";

  return {
    trend,
    prediction,
    message:
      prediction === "DECLINE"
        ? "Queda de desempenho detectada"
        : prediction === "IMPROVEMENT"
        ? "Melhora consistente"
        : "Estável"
  };
};