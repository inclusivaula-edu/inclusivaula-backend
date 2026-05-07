export const predictDropoutRisk = (studentData) => {

  const {
    avgScore,
    attendanceRate
  } = studentData;

  let riskScore = 0;

  if (avgScore < 5) riskScore += 50;
  if (attendanceRate < 70) riskScore += 40;
  if (attendanceRate < 50) riskScore += 10;

  let level = "LOW";

  if (riskScore >= 70) level = "HIGH";
  else if (riskScore >= 40) level = "MEDIUM";

  return {
    riskScore,
    level,
    prediction:
      level === "HIGH"
        ? "Alta chance de evasão"
        : level === "MEDIUM"
        ? "Risco moderado"
        : "Baixo risco"
  };
};