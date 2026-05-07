export const inclusionRisk = (student) => {

  const hasDisability =
    student.has_disability;

  if (!hasDisability) {

    return {
      risk: "NONE"
    };
  }

  const supportLevel =
    student.support_level || "low";

  let risk = "LOW";

  if (supportLevel === "none") {
    risk = "HIGH";
  }

  if (supportLevel === "low") {
    risk = "MEDIUM";
  }

  return {
    risk,
    recommendation:
      risk === "HIGH"
        ? "Intervenção imediata necessária"
        : "Acompanhamento contínuo"
  };
};