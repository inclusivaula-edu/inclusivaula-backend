function pickFields(body, allowed) {
  if (!body || typeof body !== "object") return {};
  return Object.fromEntries(
    allowed
      .filter(key => body[key] !== undefined)
      .map(key => [key, body[key]])
  );
}

export function pickStudentFields(body) {
  return pickFields(body, [
    "full_name", "grade", "birth_date", "disability_type",
    "notes", "guardian_name", "guardian_phone", "guardian_email", "turma",
    "observable_behavior", "what_helps",
    "endereco", "historico_escolar", "deficiencia_hipotese", "sistema_linguistico",
    "recursos_acessibilidade", "atividades_adaptacoes", "implicacoes_curriculares"
  ]);
}

export function pickTeacherFields(body) {
  return pickFields(body, [
    "name", "email", "subject", "phone", "specialty"
  ]);
}

export function pickClassFields(body) {
  return pickFields(body, [
    "name", "grade", "teacher_id", "year", "shift", "description"
  ]);
}

export function pickEnrollmentFields(body) {
  return pickFields(body, [
    "student_id", "class_id", "enrollment_date", "status"
  ]);
}

export function pickDisabilityFields(body) {
  return pickFields(body, [
    "student_id", "disability_type", "severity", "notes"
  ]);
}

export function pickAttendanceFields(body) {
  return pickFields(body, [
    "student_id", "class_id", "attendance_date", "status"
  ]);
}

export function pickEvaluationFields(body) {
  return pickFields(body, [
    "student_id", "class_id", "title", "score", "max_score",
    "feedback", "evaluation_date"
  ]);
}

// Mitigação de prompt injection em campos de texto livre
export function sanitizeForPrompt(text) {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") return String(text);
  return text
    // Padrões clássicos de injeção
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, "[removido]")
    .replace(/disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, "[removido]")
    .replace(/forget\s+(all\s+)?(previous|prior|above)/gi, "[removido]")
    .replace(/you\s+are\s+now/gi, "[removido]")
    .replace(/new\s+instructions?:/gi, "[removido]")
    // Tokens de sistema de vários modelos
    .replace(/\[SYSTEM\]/gi, "[removido]")
    .replace(/\[INST\]/gi, "[removido]")
    .replace(/<\|.*?\|>/g, "[removido]")
    .replace(/###\s*instruc/gi, "[removido]")
    .replace(/<<SYS>>/gi, "[removido]")
    // Tentativas de injeção via roles
    .replace(/\bsystem\s*:/gi, "[removido]")
    .replace(/\bassistant\s*:/gi, "[removido]")
    // Remove backticks em excesso (injeção de código)
    .replace(/`{3,}/g, "")
    .substring(0, 1000);
}

export function internalError(error) {
  return process.env.NODE_ENV === "development"
    ? error.message
    : "Erro interno do servidor";
}
