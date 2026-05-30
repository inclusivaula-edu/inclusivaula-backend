import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────
// NEXUS7 — GERADOR DE EXERCÍCIOS ADAPTADOS
// Recebe o conteúdo de uma aula já gerada e o perfil do aluno
// e produz exercícios com gabarito adaptados ao perfil de NEE.
// ─────────────────────────────────────────────────────────────────
export const runNexus7Exercises = async ({ lesson, student, quantidade = 5 }) => {
  const perfilAluno = student
    ? `Aluno: ${student.full_name}, Série: ${student.grade}, NEE: ${student.disability_type || "Não especificada"}, Observações: ${student.notes || "Nenhuma"}`
    : `Perfil geral — NEE: ${lesson.input?.deficiencia || "Geral"}, Série: ${lesson.input?.serie || "Não especificada"}`;

  const conteudoAula = lesson.result
    ? `Título: ${lesson.result.titulo}\nExplicação: ${lesson.result.explicacao}\nAtividades: ${lesson.result.atividades?.join("; ")}`
    : "Conteúdo não disponível";

  const prompt = `
Você é um especialista em educação inclusiva brasileira e avaliação adaptada.

Com base na aula abaixo e no perfil do aluno, crie ${quantidade} exercícios
pedagógicos adaptados, com gabarito e nível de dificuldade progressivo.

═══════════════════════════════════════════════
PERFIL DO ALUNO
═══════════════════════════════════════════════
${perfilAluno}

═══════════════════════════════════════════════
CONTEÚDO DA AULA
═══════════════════════════════════════════════
${conteudoAula}

═══════════════════════════════════════════════
DIRETRIZES OBRIGATÓRIAS
═══════════════════════════════════════════════
- Adapte a linguagem e complexidade ao perfil de NEE do aluno
- Use os princípios do DUA (Desenho Universal para Aprendizagem)
- Inclua exercícios variados: múltipla escolha, verdadeiro/falso, dissertativo curto
- Ordene do mais simples ao mais complexo
- O gabarito deve incluir a justificativa pedagógica da resposta correta
- Fundamente nas habilidades BNCC identificadas na aula

Retorne APENAS JSON válido, sem markdown, sem texto fora do JSON.

{
  "titulo": "título do conjunto de exercícios",
  "instrucoes": "instruções gerais para o aluno em linguagem adaptada ao perfil",
  "exercicios": [
    {
      "numero": 1,
      "tipo": "multipla_escolha | verdadeiro_falso | dissertativo",
      "nivel": "basico | intermediario | avancado",
      "enunciado": "texto do exercício adaptado",
      "opcoes": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "resposta_correta": "A",
      "justificativa": "por que esta é a resposta correta — explicação pedagógica",
      "adaptacao": "como este exercício foi adaptado para o perfil do aluno"
    }
  ],
  "criterios_avaliacao": "como avaliar o desempenho considerando o perfil do aluno",
  "pontuacao_maxima": 10
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Você é especialista em educação inclusiva brasileira, BNCC e avaliação adaptada. Retorne sempre JSON válido."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2500
  });

  const content = response.choices[0].message.content.trim();
  const clean = content.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
};