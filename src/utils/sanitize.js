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
    "notes", "guardian_name", "guardian_phone", "guardian_email", "turma"
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

// Mitigação básica de prompt injection em campos de texto livre
export function sanitizeForPrompt(text) {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") return String(text);
  return text
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, "[removido]")
    .replace(/\[SYSTEM\]/gi, "[removido]")
    .replace(/\[INST\]/gi, "[removido]")
    .replace(/###\s*instruc/gi, "[removido]")
    .replace(/<\|.*?\|>/g, "[removido]")
    .substring(0, 2000);
}

export function internalError(error) {
  return process.env.NODE_ENV === "development"
    ? error.message
    : "Erro interno do servidor";
}
