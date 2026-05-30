import { supabase } from "../config/supabase.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────
// TIPOS DE RELATÓRIO OBRIGATÓRIOS DO ENSINO ESPECIAL
// Cada tipo tem destinatário e linguagem específicos,
// conforme exigido pela Lei Brasileira de Inclusão e PNEE/MEC.
// ─────────────────────────────────────────────────────────────────
const TIPOS_RELATORIO = {
  semestral: {
    label: "Relatório Semestral de Progresso",
    destinatario: "coordenação pedagógica e equipe escolar",
    linguagem: "técnica e pedagógica, com base em evidências observadas"
  },
  familia: {
    label: "Relatório para a Família",
    destinatario: "pais e responsáveis",
    linguagem: "clara, acessível e empática, sem jargões técnicos"
  },
  aee: {
    label: "Relatório para o AEE",
    destinatario: "professor do Atendimento Educacional Especializado",
    linguagem: "técnica especializada, com foco nas necessidades de suporte"
  },
  pei: {
    label: "PEI — Plano Educacional Individualizado",
    destinatario: "equipe multidisciplinar e gestão escolar",
    linguagem: "formal e estruturada, com metas mensuráveis e prazos"
  }
};

export const generateStudentReport = async (studentId, tipo = "semestral", periodo = null) => {

  // ── 1. Busca o aluno ──────────────────────────────────────────
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (studentError || !student) throw new Error("Aluno não encontrado");

  // ── 2. Busca aulas geradas para este aluno ────────────────────
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, result, input, created_at, aprovado")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(20);

  // Filtra as aulas vinculadas ao aluno via input->student_id
  const aulasDoAluno = (lessons || []).filter(
    l => l.input?.student_id === studentId
  );

  // ── 3. Busca avaliações do aluno ──────────────────────────────
  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("*")
    .eq("student_id", studentId)
    .order("evaluation_date", { ascending: false });

  // ── 4. Busca frequência ───────────────────────────────────────
  const { data: attendance } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId);

  // ── 5. Calcula métricas ───────────────────────────────────────
  const totalAvaliacoes = evaluations?.length || 0;
  const mediaNota = totalAvaliacoes > 0
    ? (evaluations.reduce((acc, e) => acc + Number(e.score || 0), 0) / totalAvaliacoes).toFixed(1)
    : null;

  const totalPresencas = attendance?.length || 0;
  const presentes = attendance?.filter(a => a.present === true).length || 0;
  const frequencia = totalPresencas > 0
    ? ((presentes / totalPresencas) * 100).toFixed(0)
    : null;

  // ── 6. Monta contexto para a IA ───────────────────────────────
  const tipoConfig = TIPOS_RELATORIO[tipo] || TIPOS_RELATORIO.semestral;

  const contextoAulas = aulasDoAluno.length > 0
    ? aulasDoAluno.slice(0, 5).map(a =>
        `- "${a.result?.titulo}" (${new Date(a.created_at).toLocaleDateString("pt-BR")})${a.aprovado ? " ✓ aprovada" : ""}`
      ).join("\n")
    : "Nenhuma aula específica registrada para este aluno ainda.";

  const contextoAvaliacoes = totalAvaliacoes > 0
    ? `${totalAvaliacoes} avaliação(ões) — média: ${mediaNota}/10\n` +
      evaluations.slice(0, 3).map(e =>
        `- ${e.title || "Avaliação"}: ${e.score}/${e.max_score}${e.feedback ? ` — ${e.feedback}` : ""}`
      ).join("\n")
    : "Nenhuma avaliação registrada ainda.";

  const prompt = `
Você é um especialista em educação inclusiva brasileira com profundo conhecimento
da Lei Brasileira de Inclusão (Lei 13.146/2015), da Resolução CNE/CEB 4/2009,
do PNEE/MEC 2008 e das melhores práticas pedagógicas para alunos com NEE.

Gere um ${tipoConfig.label} completo e detalhado.

═══════════════════════════════════════════════
TIPO DE RELATÓRIO
═══════════════════════════════════════════════
Tipo: ${tipoConfig.label}
Destinatário: ${tipoConfig.destinatario}
Linguagem: ${tipoConfig.linguagem}
Período: ${periodo || "Período letivo atual"}

═══════════════════════════════════════════════
DADOS DO ALUNO
═══════════════════════════════════════════════
Nome: ${student.full_name}
Série: ${student.grade || "Não informada"}
Data de nascimento: ${student.birth_date || "Não informada"}
Necessidade especial: ${student.disability_type || "Não especificada"}
Responsável: ${student.guardian_name || "Não informado"}
Observações pedagógicas: ${student.notes || "Nenhuma observação registrada"}

═══════════════════════════════════════════════
AULAS GERADAS PARA ESTE ALUNO
═══════════════════════════════════════════════
Total de aulas: ${aulasDoAluno.length}
${contextoAulas}

═══════════════════════════════════════════════
AVALIAÇÕES E DESEMPENHO
═══════════════════════════════════════════════
${contextoAvaliacoes}

═══════════════════════════════════════════════
FREQUÊNCIA
═══════════════════════════════════════════════
${frequencia !== null ? `${frequencia}% de presença (${presentes} de ${totalPresencas} registros)` : "Frequência não registrada ainda."}

═══════════════════════════════════════════════
INSTRUÇÕES
═══════════════════════════════════════════════
- Use a linguagem adequada ao destinatário especificado
- Seja específico e baseie-se nos dados fornecidos
- Inclua recomendações práticas e acionáveis
- Fundamente nas leis e diretrizes do ensino especial brasileiro
- Se faltar dados, mencione a importância de registrá-los

Retorne APENAS JSON válido, sem markdown.

{
  "tipo": "${tipo}",
  "titulo": "título do relatório",
  "periodo": "período coberto pelo relatório",
  "aluno": {
    "nome": "${student.full_name}",
    "serie": "${student.grade || ''}",
    "nee": "${student.disability_type || ''}"
  },
  "sumario_executivo": "parágrafo resumindo o período — 3 a 5 frases",
  "desenvolvimento_academico": "análise detalhada do desempenho acadêmico",
  "desenvolvimento_social": "análise do desenvolvimento social e comportamental",
  "adaptacoes_aplicadas": "descrição das adaptações pedagógicas utilizadas",
  "pontos_positivos": ["ponto positivo 1", "ponto positivo 2", "ponto positivo 3"],
  "areas_de_atencao": ["área que precisa de atenção 1", "área 2"],
  "recomendacoes": ["recomendação prática 1", "recomendação 2", "recomendação 3"],
  "metas_proxima_periodo": ["meta 1 com prazo", "meta 2 com prazo"],
  "base_legal": "legislação e diretrizes aplicadas neste relatório",
  "observacoes_finais": "considerações finais do professor"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Você é especialista em educação inclusiva brasileira, legislação educacional e relatórios pedagógicos obrigatórios. Retorne sempre JSON válido."
      },
      { role: "user", content: prompt }
    ],
    temperature: 0.6,
    max_tokens: 2500
  });

  const content = response.choices[0].message.content.trim();
  const clean = content.replace(/```json|```/g, "").trim();
  const reportData = JSON.parse(clean);

  // ── 7. Salva no banco ─────────────────────────────────────────
  const { data: saved } = await supabase
    .from("reports")
    .insert([{
      school_id: student.school_id,
      student_id: studentId,
      generated_by: student.school_id,
      report_type: tipo,
      period: periodo || "Período letivo atual",
      content: reportData
    }])
    .select()
    .single();

  return {
    reportId: saved?.id,
    student,
    metrics: { mediaNota, frequencia, totalAvaliacoes, totalAulas: aulasDoAluno.length },
    report: reportData
  };
};