import { supabase } from "../config/supabase.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TIPOS_RELATORIO = {
  semestral: { label: "Relatório Semestral de Progresso", destinatario: "coordenação pedagógica e equipe escolar", linguagem: "técnica e pedagógica, com base em evidências observadas" },
  familia: { label: "Relatório para a Família", destinatario: "pais e responsáveis", linguagem: "clara, acessível e empática, sem jargões técnicos" },
  aee: { label: "Relatório para o AEE", destinatario: "professor do Atendimento Educacional Especializado", linguagem: "técnica especializada, com foco nas necessidades de suporte" },
  pei: { label: "PEI — Plano Educacional Individualizado", destinatario: "equipe multidisciplinar e gestão escolar", linguagem: "formal e estruturada, com metas mensuráveis e prazos" },
  paee: { label: "PAEE — Plano de AEE", destinatario: "equipe do AEE e gestão escolar", linguagem: "técnica e detalhada, descrevendo o plano de atendimento, recursos e frequência do AEE" }
};

export const generateStudentReport = async (studentId, tipo = "semestral", periodo = null) => {

  // 1. Busca o aluno
  const { data: student, error: studentError } = await supabase
    .from("students").select("*").eq("id", studentId).single();
  if (studentError || !student) throw new Error("Aluno não encontrado");

  // 2. Busca aulas vinculadas ao aluno
  const { data: lessons } = await supabase
    .from("lessons").select("id, result, input, created_at, aprovado")
    .eq("status", "completed")
    .order("created_at", { ascending: false }).limit(20);

  const aulasDoAluno = (lessons || []).filter(l => l.input?.student_id === studentId);

  // 3. Busca avaliações
  const { data: evaluations } = await supabase
    .from("evaluations").select("*").eq("student_id", studentId)
    .order("evaluation_date", { ascending: false });

  // 4. Busca frequência
  const { data: attendance } = await supabase
    .from("attendance").select("*").eq("student_id", studentId);

  // 5. Calcula métricas
  const totalAvaliacoes = evaluations?.length || 0;
  const mediaNota = totalAvaliacoes > 0
    ? (evaluations.reduce((acc, e) => acc + Number(e.score || 0), 0) / totalAvaliacoes).toFixed(1)
    : null;

  const totalPresencas = attendance?.length || 0;
  const presentes = attendance?.filter(a => a.status === "present" || a.present === true).length || 0;
  const frequencia = totalPresencas > 0
    ? ((presentes / totalPresencas) * 100).toFixed(0) : null;

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
Você é um especialista em educação inclusiva brasileira com profundo conhecimento da Lei Brasileira de Inclusão (Lei 13.146/2015), da Resolução CNE/CEB 4/2009, do PNEE/MEC 2008 e das melhores práticas pedagógicas para alunos com NEE.

Gere um ${tipoConfig.label} completo e detalhado.

TIPO: ${tipoConfig.label}
DESTINATÁRIO: ${tipoConfig.destinatario}
LINGUAGEM: ${tipoConfig.linguagem}
PERÍODO: ${periodo || "Período letivo atual"}

DADOS DO ALUNO:
Nome: ${student.full_name}
Série: ${student.grade || "Não informada"}
Turma: ${student.turma || "Não informada"}
Data de nascimento: ${student.birth_date || "Não informada"}
NEE: ${student.disability_type || "Não especificada"}
Responsável: ${student.guardian_name || "Não informado"}
Observações: ${student.notes || "Nenhuma"}

AULAS GERADAS: ${aulasDoAluno.length}
${contextoAulas}

AVALIAÇÕES: ${contextoAvaliacoes}

FREQUÊNCIA: ${frequencia !== null ? `${frequencia}% (${presentes} de ${totalPresencas} registros)` : "Não registrada."}

Retorne APENAS JSON válido, sem markdown.

{
  "tipo": "${tipo}",
  "titulo": "título do relatório",
  "periodo": "${periodo || "Período letivo atual"}",
  "aluno": { "nome": "${student.full_name}", "serie": "${student.grade || ""}", "turma": "${student.turma || ""}", "nee": "${student.disability_type || ""}" },
  "sumario_executivo": "parágrafo resumindo o período",
  "desenvolvimento_academico": "análise do desempenho acadêmico",
  "desenvolvimento_social": "análise social e comportamental",
  "adaptacoes_aplicadas": "adaptações pedagógicas utilizadas",
  "pontos_positivos": ["ponto 1", "ponto 2", "ponto 3"],
  "areas_de_atencao": ["área 1", "área 2"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "metas_proxima_periodo": ["meta 1", "meta 2"],
  "base_legal": "legislação aplicada",
  "observacoes_finais": "considerações finais"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Você é especialista em educação inclusiva brasileira e relatórios pedagógicos. Retorne sempre JSON válido." },
      { role: "user", content: prompt }
    ],
    temperature: 0.6,
    max_tokens: 2500
  });

  const content = response.choices[0].message.content.trim();
  const clean = content.replace(/```json|```/g, "").trim();
  const reportData = JSON.parse(clean);

  // 6. Salva no banco — usando school_id do aluno e desabilitando RLS
  console.log("Salvando relatório para aluno:", studentId, "escola:", student.school_id);

  const { data: saved, error: saveError } = await supabase
    .from("reports")
    .insert([{
      school_id: student.school_id,
      student_id: studentId,
      generated_by: student.school_id,
      report_type: tipo,
      period: periodo || "Período letivo atual",
      content: {
        report: reportData,
        metrics: {
          mediaNota,
          frequencia,
          totalAvaliacoes,
          totalAulas: aulasDoAluno.length
        }
      }
    }])
    .select()
    .single();

  if (saveError) {
    console.error("❌ Erro ao salvar relatório:", saveError.message, saveError.details);
  } else {
    console.log("✅ Relatório salvo com ID:", saved?.id);
  }

  return {
    reportId: saved?.id,
    student,
    metrics: { mediaNota, frequencia, totalAvaliacoes, totalAulas: aulasDoAluno.length },
    report: reportData
  };
};