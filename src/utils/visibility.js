// Papéis de gestão enxergam todos os documentos da escola;
// professor comum enxerga apenas o que ele mesmo criou.
export const ROLES_GESTAO = ["coordenador", "diretor", "secretaria", "mec"];

export function veTodosDaEscola(role) {
  return ROLES_GESTAO.includes(role);
}
