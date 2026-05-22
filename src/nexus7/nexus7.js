import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧠 Regras pedagógicas por necessidade
function aplicarRegrasPedagogicas(input) {
  const regras = {
    TEA: "Use linguagem simples, direta e sem ambiguidades. Prefira atividades visuais, rotinas claras e instruções passo a passo. Evite sobrecarga sensorial.",
    TDAH: "Use atividades curtas, dinâmicas e interativas. Divida tarefas em etapas pequenas. Inclua pausas e elementos de gamificação.",
    Dislexia: "Use fontes legíveis, textos curtos e espaçados. Prefira instruções orais e visuais. Evite textos longos sem apoio visual.",
    "Baixa visão": "Descreva todos os elementos visuais em texto. Use alto contraste e fontes grandes. Prefira conteúdo auditivo e tátil.",
    "Deficiência auditiva": "Use recursos visuais, imagens e texto escrito. Evite dependência de áudio. Inclua legendas e descrições visuais.",
    "Deficiência intelectual": "Use linguagem simples e concreta. Atividades práticas e manipulativas. Repetição e reforço positivo constante.",
    Geral: "Use linguagem clara e acessível. Varie os formatos de atividade para atender diferentes estilos de aprendizagem."
  };

  return regras[input.deficiencia] || regras["Geral"];
}

// 🔥 Motor principal do Nexus7
export const runNexus7 = async (input) => {
  const regrasPedagogicas = aplicarRegrasPedagogicas(input);

  const prompt = `
Você é um especialista em educação inclusiva e pedagogia adaptada.

Crie um plano de aula completo com base nos seguintes dados:

- Tema: ${input.tema}
- Série: ${input.serie}
- Duração: ${input.duracao} minutos
- Perfil do aluno: ${input.deficiencia}
- Objetivo: ${input.objetivo || "Garantir compreensão do tema"}

Diretrizes pedagógicas obrigatórias para este perfil:
${regrasPedagogicas}

Retorne APENAS um JSON válido, sem texto adicional, sem markdown, sem explicações fora do JSON.

Formato exato:
{
  "titulo": "título da aula",
  "estrategia": "estratégia pedagógica adaptada para o perfil",
  "explicacao": "explicação do conteúdo adaptada ao perfil e série",
  "atividades": [
    "descrição da atividade 1",
    "descrição da atividade 2",
    "descrição da atividade 3"
  ],
  "adaptacoes": [
    "adaptação específica 1 para o perfil",
    "adaptação específica 2 para o perfil"
  ],
  "recursos": [
    "recurso didático 1",
    "recurso didático 2"
  ],
  "avaliacao": "como avaliar o aprendizado deste aluno"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Você é um especialista em educação inclusiva brasileira, BNCC e pedagogia adaptada. Retorne sempre JSON válido."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1500
  });

  const content = response.choices[0].message.content.trim();

  const clean = content.replace(/```json|```/g, "").trim();
  const result = JSON.parse(clean);

  return result;
};