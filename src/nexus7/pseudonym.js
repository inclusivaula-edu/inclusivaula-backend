/**
 * Pseudonimização LGPD (Art. 13 §4º / Art. 33): o nome real do aluno nunca é
 * enviado ao provedor de IA. O prompt recebe o marcador [NOME_DO_ALUNO] e o
 * nome verdadeiro é reinserido no resultado somente dentro da nossa infraestrutura.
 */
export const STUDENT_TOKEN = "[NOME_DO_ALUNO]";

// Reinsere o nome real em todas as strings do resultado gerado.
export function unmaskResult(obj, fullName) {
  if (!fullName || !obj) return obj;
  const walk = (o) => {
    if (typeof o === "string") return o.split(STUDENT_TOKEN).join(fullName);
    if (Array.isArray(o)) return o.map(walk);
    if (o && typeof o === "object") {
      return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)]));
    }
    return o;
  };
  return walk(obj);
}
