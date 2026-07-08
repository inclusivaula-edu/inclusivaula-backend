import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Loop de auto-revisão: valida e corrige o output do Nexus7
 * antes de entregá-lo ao professor.
 *
 * Verifica:
 * - Coerência dos códigos BNCC com a série e disciplina
 * - Adaptações coerentes com o perfil de NEE
 * - Linguagem adequada à série
 * - Completude dos campos obrigatórios
 * - Fundamentação legal presente
 *
 * Retorna o JSON corrigido ou o original se já estiver correto.
 */
export async function reviewOutput(output, { type = "lesson", serie, disciplina, deficiencia }) {
  if (!output || typeof output !== "object") return output;

  const prompt = `
Você é um revisor pedagógico especializado em educação inclusiva brasileira.

Analise o JSON abaixo (gerado por IA) e faça APENAS correções necessárias.
Não reescreva o conteúdo inteiro — corrija somente o que estiver errado.

TIPO DE DOCUMENTO: ${type}
SÉRIE: ${serie || "não especificada"}
DISCIPLINA: ${disciplina || "não especificada"}
PERFIL NEE: ${deficiencia || "Geral"}

CHECKLIST DE REVISÃO:
1. BNCC: os códigos seguem o padrão correto? (EF01MA01, EM13CNT101, etc.)
   - O prefixo deve corresponder à série (EF01 = 1º ano EF, EF07 = 7º ano EF, EM13 = EM)
   - O componente deve corresponder à disciplina (MA=Matemática, LP=Língua Portuguesa, CI=Ciências, HI=História, GE=Geografia, EF=Ed.Física, AR=Artes, LI=Inglês)
   - Se um código parecer inventado, REMOVA-O e substitua por um plausível ou marque como "verificar"
2. ADAPTAÇÕES: são coerentes com o perfil de NEE informado?
   - TEA: linguagem literal, rotina visual, sem ambiguidades
   - TDAH: atividades curtas, gamificação, variação de formato
   - Dislexia: suporte auditivo, fontes ampliadas, sem pressão de leitura
   - DI: linguagem simples, manipuláveis, reforço positivo
   - Se houver adaptações genéricas demais, torne-as específicas
3. LINGUAGEM: adequada à faixa etária da série?
4. CAMPOS: todos os campos esperados estão preenchidos e não-vazios?
5. BASE LEGAL: referências legais mencionam artigos e incisos específicos?

Se tudo estiver correto, retorne o JSON original SEM ALTERAÇÕES.
Se houver correções, retorne o JSON corrigido.

Retorne APENAS o JSON, sem markdown, sem explicações fora do JSON.

JSON PARA REVISAR:
${JSON.stringify(output, null, 2)}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você é um revisor pedagógico. Corrija apenas erros factuais, códigos BNCC inválidos e adaptações incoerentes. Retorne JSON válido."
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: "json_object" }
    });

    if (response.usage) {
      console.log(JSON.stringify({ agent: "review", type, prompt_tokens: response.usage.prompt_tokens, completion_tokens: response.usage.completion_tokens }));
    }

    const content = response.choices[0].message.content.trim();
    const clean = content.replace(/```json|```/g, "").trim();

    const reviewed = JSON.parse(clean);

    reviewed._reviewed = true;

    return reviewed;
  } catch (err) {
    console.error("Review loop error:", err.message);
    output._reviewed = false;
    return output;
  }
}
