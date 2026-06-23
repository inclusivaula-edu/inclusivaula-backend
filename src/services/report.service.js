import { supabase } from "../config/supabase.js";
import OpenAI from "openai";
import { verificarLimiteRelatorio, incrementarRelatorio } from "./usage.service.js";
import { sanitizeForPrompt } from "../utils/sanitize.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TIPOS_RELATORIO = {
  semestral: { label: "Relatório Semestral de Progresso", destinatario: "coordenação pedagógica e equipe escolar", linguagem: "técnica e pedagógica, com base em evidências observadas" },
  familia:   { label: "Relatório para a Família", destinatario: "pais e responsáveis", linguagem: "clara, acessível e empática, sem jargões técnicos" },
  aee:       { label: "Relatório para o AEE", destinatario: "professor do Atendimento Educacional Especializado", linguagem: "técnica especializada, com foco nas necessidades de suporte" },
  pei:       { label: "PEI — Plano Educacional Individualizado", destinatario: "equipe multidisciplinar e gestão escolar", linguagem: "formal e estruturada, com metas mensuráveis e prazos" },
  paee:      { label: "PAEE — Plano de AEE", destinatario: "equipe do AEE e gestão escolar", linguagem: "técnica e detalhada, descrevendo plano de atendimento, recursos e frequência do AEE" }
};

export const generateStudentReport = async (studentId, tipo = "semestral", periodo = null, userId = null) => {

  // Busca o aluno
  const { data: student, error: studentError } = await supabase
    .from("students").select("*").eq("id", studentId).single();
  if (studentError || !student) throw new Error("Aluno não encontrado");

  // Verifica limite de relatórios
  if (userId) {
    const limite = await verificarLimiteRelatorio(userId, student.school_id);
    if (!limite.permitido) throw new Error(limite.mensagem);
  }

  // Busca aulas do aluno diretamente com filtro no banco
  const { data: lessons } = await supabase
    .from("lessons").select("id, result, input, created_at, aprovado")
    .eq("status", "completed")
    .eq("school_id", student.school_id)
    .contains("input", { student_id: studentId })
    .order("created_at", { ascending: false }).limit(20);

  const aulasDoAluno = lessons || [];

  // Busca avaliações
  const { data: evaluations } = await supabase
    .from("evaluations").select("*").eq("student_id", studentId)
    .order("evaluation_date", { ascending: false });

  // Busca frequência
  const { data: attendance } = await supabase
    .from("attendance").select("*").eq("student_id", studentId);

  // Calcula métricas
  const totalAvaliacoes = evaluations?.length || 0;
  const mediaNota = totalAvaliacoes > 0
    ? (evaluations.reduce((acc, e) => acc + Number(e.score || 0), 0) / totalAvaliacoes).toFixed(1)
    : null;

  const totalPresencas = attendance?.length || 0;
  const presentes = attendance?.filter(a => a.status === "present" || a.present === true).length || 0;
  const frequencia = totalPresencas > 0 ? ((presentes / totalPresencas) * 100).toFixed(0) : null;

  const tipoConfig = TIPOS_RELATORIO[tipo] || TIPOS_RELATORIO.semestral;

  // Sanitiza todos os campos do aluno antes de interpolar no prompt
  const s = {
    full_name: sanitizeForPrompt(student.full_name),
    grade: sanitizeForPrompt(student.grade),
    turma: sanitizeForPrompt(student.turma),
    birth_date: sanitizeForPrompt(student.birth_date),
    disability_type: sanitizeForPrompt(student.disability_type),
    guardian_name: sanitizeForPrompt(student.guardian_name),
    notes: sanitizeForPrompt(student.notes),
  };
  const periodoSafe = sanitizeForPrompt(periodo);

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
PERÍODO: ${periodoSafe || "Período letivo atual"}

DADOS DO ALUNO:
Nome: ${s.full_name}
Série: ${s.grade || "Não informada"}
Turma: ${s.turma || "Não informada"}
Data de nascimento: ${s.birth_date || "Não informada"}
NEE: ${s.disability_type || "Não especificada"}
Responsável: ${s.guardian_name || "Não informado"}
Observações: ${s.notes || "Nenhuma"}

AULAS GERADAS PARA O ALUNO: ${aulasDoAluno.length}
${contextoAulas}

AVALIAÇÕES:
${contextoAvaliacoes}

FREQUÊNCIA: ${frequencia !== null ? `${frequencia}% (${presentes} de ${totalPresencas} registros)` : "Não registrada."}

Retorne APENAS JSON válido, sem markdown.

{
  "tipo": "${tipo}",
  "titulo": "título do relatório",
  "periodo": "${periodoSafe || "Período letivo atual"}",
  "aluno": { "nome": "${s.full_name}", "serie": "${s.grade || ""}", "turma": "${s.turma || ""}", "nee": "${s.disability_type || ""}" },
  "sumario_executivo": "parágrafo resumindo o período",
  "desenvolvimento_academico": "análise do desempenho acadêmico",
  "desenvolvimento_social": "análise social e comportamental",
  "adaptacoes_aplicadas": "adaptações pedagógicas utilizadas",
  "pontos_positivos": ["ponto 1", "ponto 2", "ponto 3"],
  "areas_de_atencao": ["área 1", "área 2"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "metas_proxima_periodo": ["meta 1 com prazo", "meta 2 com prazo"],
  "base_legal": "legislação e diretrizes aplicadas",
  "observacoes_finais": "considerações finais do professor"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Você é especialista em educação inclusiva brasileira e relatórios pedagógicos obrigatórios. Retorne sempre JSON válido." },
      { role: "user", content: prompt }
    ],
    temperature: 0.6,
    max_tokens: 2500
  });

  const content = response.choices[0].message.content.trim();
  const clean = content.replace(/```json|```/g, "").trim();
  let reportData;
  try {
    reportData = JSON.parse(clean);
  } catch {
    throw new Error("A IA retornou uma resposta inválida. Tente novamente.");
  }

  // Salva no banco
  const { data: saved, error: saveError } = await supabase
    .from("reports")
    .insert([{
      school_id: student.school_id,
      student_id: studentId,
      generated_by: null,
      report_type: tipo,
      period: periodo || "Período letivo atual",
      aprovado: false,
      content: {
        report: reportData,
        metrics: { mediaNota, frequencia, totalAvaliacoes, totalAulas: aulasDoAluno.length }
      }
    }])
    .select().single();

  if (saveError) {
    console.error("❌ Erro ao salvar relatório:", saveError.message);
  } else {
    // Incrementa contador só após salvar com sucesso
    if (userId) await incrementarRelatorio(userId);
    console.log("✅ Relatório salvo:", saved?.id);
  }

  return {
    reportId: saved?.id,
    student,
    metrics: { mediaNota, frequencia, totalAvaliacoes, totalAulas: aulasDoAluno.length },
    report: reportData
  };
};