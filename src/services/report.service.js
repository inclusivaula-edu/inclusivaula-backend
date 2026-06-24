import { supabase } from "../config/supabase.js";
import OpenAI from "openai";
import { verificarLimiteRelatorio, incrementarRelatorio } from "./usage.service.js";
import { sanitizeForPrompt } from "../utils/sanitize.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const TIPOS_RELATORIO = {
  semestral:            { label: "Relatório Semestral de Progresso",        destinatario: "coordenação pedagógica e equipe escolar",                             linguagem: "técnica e pedagógica, com base em evidências observadas" },
  familia:              { label: "Relatório para a Família",                 destinatario: "pais e responsáveis",                                                linguagem: "clara, acessível e empática, sem jargões técnicos" },
  aee:                  { label: "Relatório para o AEE",                    destinatario: "professor do Atendimento Educacional Especializado",                  linguagem: "técnica especializada, com foco nas necessidades de suporte" },
  pei:                  { label: "PEI — Plano Educacional Individualizado", destinatario: "equipe multidisciplinar e gestão escolar",                           linguagem: "formal e estruturada, com metas mensuráveis e prazos" },
  evolucao:             { label: "Relatório de Evolução AEE",               destinatario: "equipe pedagógica e gestão escolar",                                 linguagem: "técnica e descritiva, registrando progresso com base em observações das sessões AEE" }
};

// ─── Avaliação Pedagógica para Elegibilidade ao AEE (Art. 9 Res. CNE/CEB 4/2009) ───
async function gerarAvaliacaoPedagogica(student, periodo, escola) {
  const s = {
    full_name:       sanitizeForPrompt(student.full_name),
    grade:           sanitizeForPrompt(student.grade),
    turma:           sanitizeForPrompt(student.turma),
    disability_type: sanitizeForPrompt(student.disability_type),
    notes:           sanitizeForPrompt(student.notes)
  };
  const prompt = `
Você é especialista em avaliação pedagógica para elegibilidade ao AEE no Brasil.
Gere uma Avaliação Pedagógica completa conforme Art. 9 da Res. CNE/CEB 4/2009 e Decreto 7.611/2011.

ALUNO: ${s.full_name} | Série: ${s.grade || "NI"} | Turma: ${s.turma || "NI"} | NEE: ${s.disability_type || "NI"}
Observações: ${s.notes || "Nenhuma"} | Período: ${sanitizeForPrompt(periodo) || "Atual"} | Escola: ${sanitizeForPrompt(escola) || "NI"}

Retorne APENAS JSON válido:
{
  "titulo": "Avaliação Pedagógica para Elegibilidade ao AEE",
  "aluno": { "nome": "${s.full_name}", "serie": "${s.grade || ""}", "turma": "${s.turma || ""}", "nee": "${s.disability_type || ""}" },
  "periodo": "${sanitizeForPrompt(periodo) || "Período letivo atual"}",
  "historico_escolar": "descrição do histórico escolar e trajetória do aluno",
  "avaliacao_cognitiva": "análise do funcionamento cognitivo, atenção, memória e raciocínio",
  "avaliacao_comunicacao": "análise da comunicação expressiva e receptiva",
  "avaliacao_motora": "análise da motricidade fina e grossa",
  "avaliacao_comportamental": "análise do comportamento, interação social e autonomia",
  "barreiras_identificadas": ["barreira 1", "barreira 2", "barreira 3"],
  "recursos_necessarios": ["recurso 1", "recurso 2"],
  "conclusao": "conclusão fundamentada sobre as necessidades educacionais especiais",
  "recomendacao_aee": "SIM — AEE complementar na Sala de Recursos Multifuncionais Tipo I",
  "base_legal": "Art. 9 Res. CNE/CEB 4/2009; Decreto 7.611/2011; Lei 13.146/2015 Art. 2"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Especialista em educação inclusiva brasileira. Retorne sempre JSON válido." },
      { role: "user", content: prompt }
    ],
    temperature: 0.4, max_tokens: 2000
  });
  const raw = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// ─── Adequação Curricular (LDB Art. 59; Res. CNE/CEB 2/2001) ───
async function gerarAdequacaoCurricular(student, periodo, escola) {
  const s = {
    full_name:       sanitizeForPrompt(student.full_name),
    grade:           sanitizeForPrompt(student.grade),
    turma:           sanitizeForPrompt(student.turma),
    disability_type: sanitizeForPrompt(student.disability_type),
    notes:           sanitizeForPrompt(student.notes)
  };
  const prompt = `
Você é especialista em adequação curricular para inclusão escolar no Brasil.
Gere um Plano de Adequação Curricular completo conforme LDB Art. 59, Res. CNE/CEB 2/2001 e Lei 13.146/2015 Art. 28.

ALUNO: ${s.full_name} | Série: ${s.grade || "NI"} | Turma: ${s.turma || "NI"} | NEE: ${s.disability_type || "NI"}
Observações: ${s.notes || "Nenhuma"} | Período: ${sanitizeForPrompt(periodo) || "Atual"}

Retorne APENAS JSON válido:
{
  "titulo": "Adequação Curricular",
  "aluno": { "nome": "${s.full_name}", "serie": "${s.grade || ""}", "turma": "${s.turma || ""}", "nee": "${s.disability_type || ""}" },
  "periodo": "${sanitizeForPrompt(periodo) || "Período letivo atual"}",
  "principios_orientadores": "princípios que fundamentam as adequações para este aluno",
  "componentes": [
    {
      "componente": "Língua Portuguesa",
      "adaptacoes_conteudo": "adequações nos conteúdos programáticos",
      "adaptacoes_metodologicas": ["estratégia 1", "estratégia 2"],
      "adaptacoes_avaliacao": "formas alternativas de avaliação",
      "recursos": ["recurso 1", "recurso 2"]
    },
    {
      "componente": "Matemática",
      "adaptacoes_conteudo": "adequações nos conteúdos programáticos",
      "adaptacoes_metodologicas": ["estratégia 1", "estratégia 2"],
      "adaptacoes_avaliacao": "formas alternativas de avaliação",
      "recursos": ["recurso 1"]
    },
    {
      "componente": "Ciências / Outras áreas",
      "adaptacoes_conteudo": "adequações gerais para demais componentes",
      "adaptacoes_metodologicas": ["estratégia 1"],
      "adaptacoes_avaliacao": "formas alternativas de avaliação",
      "recursos": ["recurso 1"]
    }
  ],
  "observacoes_gerais": "orientações gerais para toda a equipe pedagógica",
  "base_legal": "LDB 9.394/96 Art. 59; Res. CNE/CEB 2/2001; Lei 13.146/2015 Art. 28; PNEE/MEC 2008"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Especialista em educação inclusiva brasileira. Retorne sempre JSON válido." },
      { role: "user", content: prompt }
    ],
    temperature: 0.4, max_tokens: 2500
  });
  const raw = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// ─── Termo de Ciência dos Pais/Responsáveis (Decreto 7.611/2011 Art. 2) ───
async function gerarTermoCiencia(student, periodo, escola) {
  const s = {
    full_name:       sanitizeForPrompt(student.full_name),
    grade:           sanitizeForPrompt(student.grade),
    turma:           sanitizeForPrompt(student.turma),
    disability_type: sanitizeForPrompt(student.disability_type),
    guardian_name:   sanitizeForPrompt(student.guardian_name)
  };
  const prompt = `
Gere um Termo de Ciência dos Pais/Responsáveis sobre o AEE, conforme Decreto 7.611/2011 Art. 2 e Res. CNE/CEB 4/2009.

ALUNO: ${s.full_name} | Série: ${s.grade || "NI"} | Turma: ${s.turma || "NI"} | NEE: ${s.disability_type || "NI"}
Responsável: ${s.guardian_name || "Responsável"} | Escola: ${sanitizeForPrompt(escola) || "NI"} | Período: ${sanitizeForPrompt(periodo) || "Atual"}

Retorne APENAS JSON válido:
{
  "titulo": "Termo de Ciência dos Pais/Responsáveis — AEE",
  "aluno": { "nome": "${s.full_name}", "serie": "${s.grade || ""}", "turma": "${s.turma || ""}", "nee": "${s.disability_type || ""}", "responsavel": "${s.guardian_name || "Responsável"}" },
  "escola": "${sanitizeForPrompt(escola) || ""}",
  "periodo": "${sanitizeForPrompt(periodo) || "Período letivo atual"}",
  "descricao_atendimento": "descrição clara e acessível sobre o que é o AEE e como será realizado",
  "frequencia_prevista": "2 sessões semanais de 50 minutos",
  "local_atendimento": "Sala de Recursos Multifuncionais da própria escola",
  "responsabilidades_escola": [
    "Oferecer o AEE na Sala de Recursos Multifuncionais",
    "Comunicar os pais sobre a evolução do aluno",
    "Articular o AEE com a sala de aula regular"
  ],
  "responsabilidades_familia": [
    "Manter o aluno frequente às sessões de AEE",
    "Informar a escola sobre mudanças no quadro clínico do aluno",
    "Participar das reuniões de acompanhamento"
  ],
  "base_legal": "Decreto 7.611/2011 Art. 2; Res. CNE/CEB 4/2009; Lei 13.146/2015"
}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Especialista em educação inclusiva. Retorne sempre JSON válido." },
      { role: "user", content: prompt }
    ],
    temperature: 0.3, max_tokens: 1500
  });
  const raw = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// Gera PAEE com estrutura específica (igual ao Plano AEE do nexus7)
async function gerarPAEE(student, periodo, escola) {
  const s = {
    full_name: sanitizeForPrompt(student.full_name),
    grade: sanitizeForPrompt(student.grade),
    disability_type: sanitizeForPrompt(student.disability_type),
    notes: sanitizeForPrompt(student.notes)
  };
  const periodoSafe = sanitizeForPrompt(periodo);
  const escolaSafe = sanitizeForPrompt(escola || "");

  const prompt = `
Você é especialista em AEE (Atendimento Educacional Especializado) no Brasil.
Gere um PAEE — Plano de Atendimento Educacional Especializado completo, fundamentado na legislação brasileira.

BASE LEGAL OBRIGATÓRIA: Decreto 7.611/2011; Res. CNE/CEB 4/2009; LDB 9.394/1996 Arts. 58-60; Lei 13.146/2015 Art. 28; Portaria MEC 13/2007.

DADOS DO ALUNO:
Nome: ${s.full_name}
Série: ${s.grade || "Não informada"}
NEE: ${s.disability_type || "Não especificada"}
Observações: ${s.notes || "Nenhuma"}
Período: ${periodoSafe || "Período letivo atual"}
Escola: ${escolaSafe || "Não informada"}

Retorne APENAS JSON válido (sem markdown):

{
  "identificacao": {
    "nome_aluno": "${s.full_name}",
    "serie": "${s.grade || ""}",
    "escola": "${escolaSafe}",
    "periodo": "${periodoSafe}",
    "deficiencia_nee": "${s.disability_type || ""}",
    "tipo_atendimento": "AEE complementar ou suplementar"
  },
  "avaliacao_inicial": {
    "necessidades_especificas": "descrição detalhada das necessidades específicas",
    "habilidades_preservadas": ["habilidade 1", "habilidade 2", "habilidade 3"],
    "barreiras_aprendizagem": ["barreira 1", "barreira 2", "barreira 3"]
  },
  "plano_atendimento": {
    "frequencia": "2 sessões semanais de 50 minutos",
    "duracao": "50 minutos",
    "local": "Sala de Recursos Multifuncionais — Tipo I",
    "agrupamento": "individual ou pequeno grupo",
    "objetivos": ["objetivo 1", "objetivo 2", "objetivo 3"],
    "atividades": [
      {"atividade": "Nome da atividade", "descricao": "Descrição da atividade"}
    ]
  },
  "tecnologia_assistiva": [
    {"recurso": "Nome do recurso", "uso_no_aee": "Como será utilizado"}
  ],
  "articulacao_sala_regular": {
    "orientacoes_professor": ["orientação 1", "orientação 2", "orientação 3"]
  },
  "articulacao_familia": {
    "orientacoes": ["orientação 1", "orientação 2", "orientação 3"]
  },
  "avaliacao_resultados": {
    "instrumentos": ["portfólio de atividades", "relatório descritivo bimestral", "ficha de observação"]
  },
  "base_legal": "Decreto 7.611/2011; Res. CNE/CEB 4/2009; LDB 9.394/1996 Arts. 58-60; Lei 13.146/2015 Art. 28; Portaria MEC 13/2007"
}`;

  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Especialista em educação inclusiva brasileira. Retorne sempre JSON válido." },
      { role: "user", content: prompt }
    ],
    temperature: 0.5,
    max_tokens: 2500
  });

  const raw = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

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

  // PAEE tem gerador próprio com estrutura específica
  if (tipo === "paee") {
    if (userId) {
      const limite = await verificarLimiteRelatorio(userId, student.school_id);
      if (!limite.permitido) throw new Error(limite.mensagem);
    }
    const escolaNome = student.school_id
      ? (await supabase.from("schools").select("name").eq("id", student.school_id).single()).data?.name || ""
      : "";
    const reportData = await gerarPAEE(student, periodo, escolaNome);

    // UPSERT: sobrescreve se já existe PAEE para este aluno
    const { data: existente } = await supabase
      .from("reports").select("id")
      .eq("student_id", studentId).eq("report_type", "paee").maybeSingle();

    let saved;
    if (existente) {
      const { data } = await supabase.from("reports")
        .update({ content: { report: reportData, metrics: {} }, period: periodo || "Período letivo atual", aprovado: false })
        .eq("id", existente.id).select().single();
      saved = data;
    } else {
      const { data } = await supabase.from("reports").insert([{
        school_id: student.school_id,
        student_id: studentId,
        generated_by: userId,
        report_type: "paee",
        period: periodo || "Período letivo atual",
        aprovado: false,
        content: { report: reportData, metrics: {} }
      }]).select().single();
      saved = data;
    }
    if (userId) await incrementarRelatorio(userId);
    return { reportId: saved?.id, student, metrics: {}, report: reportData };
  }

  // ─── Tipos com gerador especializado e UPSERT ───────────────────
  const TIPOS_ESPECIALIZADOS = ["avaliacao_pedagogica", "adequacao_curricular", "termo_ciencia"];
  if (TIPOS_ESPECIALIZADOS.includes(tipo)) {
    const escolaNome = student.school_id
      ? (await supabase.from("schools").select("name").eq("id", student.school_id).single()).data?.name || ""
      : "";

    let reportData;
    if (tipo === "avaliacao_pedagogica") {
      reportData = await gerarAvaliacaoPedagogica(student, periodo, escolaNome);
    } else if (tipo === "adequacao_curricular") {
      reportData = await gerarAdequacaoCurricular(student, periodo, escolaNome);
    } else {
      reportData = await gerarTermoCiencia(student, periodo, escolaNome);
    }

    const { data: existente } = await supabase.from("reports").select("id")
      .eq("student_id", studentId).eq("report_type", tipo).maybeSingle();

    let saved;
    if (existente) {
      const { data } = await supabase.from("reports")
        .update({ content: { report: reportData, metrics: {} }, period: periodo || "Período letivo atual", aprovado: false })
        .eq("id", existente.id).select().single();
      saved = data;
    } else {
      const { data } = await supabase.from("reports").insert([{
        school_id: student.school_id, student_id: studentId, generated_by: userId,
        report_type: tipo, period: periodo || "Período letivo atual",
        aprovado: false, content: { report: reportData, metrics: {} }
      }]).select().single();
      saved = data;
    }
    if (userId) await incrementarRelatorio(userId);
    return { reportId: saved?.id, student, metrics: {}, report: reportData };
  }

  // ─── Evolução: fluxo genérico com dados de sessões AEE ──────────
  if (tipo === "evolucao") {
    const { data: sessions } = await supabase.from("aee_sessions")
      .select("data_sessao, presente, objetivos, atividades, evolucao")
      .eq("student_id", studentId)
      .order("data_sessao", { ascending: false }).limit(20);

    const sessoes = sessions || [];
    const totalSessoes = sessoes.length;
    const presencas = sessoes.filter(s => s.presente).length;
    const pct = totalSessoes > 0 ? Math.round((presencas / totalSessoes) * 100) : null;

    const contextoSessoes = totalSessoes > 0
      ? sessoes.slice(0, 8).map(s =>
          `${s.data_sessao}: ${s.presente ? "Presente" : "Ausente"}${s.evolucao ? ` — ${s.evolucao}` : ""}${s.objetivos ? ` | Obj: ${s.objetivos}` : ""}`
        ).join("\n")
      : "Nenhuma sessão de AEE registrada ainda.";

    const s = {
      full_name:       sanitizeForPrompt(student.full_name),
      grade:           sanitizeForPrompt(student.grade),
      turma:           sanitizeForPrompt(student.turma),
      disability_type: sanitizeForPrompt(student.disability_type),
      notes:           sanitizeForPrompt(student.notes)
    };
    const periodoSafe = sanitizeForPrompt(periodo);

    const promptEvolucao = `
Você é especialista em AEE no Brasil. Gere um Relatório de Evolução do aluno com base nas sessões de AEE registradas.

ALUNO: ${s.full_name} | Série: ${s.grade || "NI"} | NEE: ${s.disability_type || "NI"}
PERÍODO: ${periodoSafe || "Período letivo atual"}
SESSÕES AEE (${totalSessoes} total, ${presencas} presentes${pct ? `, ${pct}%` : ""}):
${contextoSessoes}
Observações gerais: ${s.notes || "Nenhuma"}

Retorne APENAS JSON válido (estrutura padrão):
{
  "tipo": "evolucao",
  "titulo": "Relatório de Evolução — AEE",
  "periodo": "${periodoSafe || "Período letivo atual"}",
  "aluno": { "nome": "${s.full_name}", "serie": "${s.grade || ""}", "turma": "${s.turma || ""}", "nee": "${s.disability_type || ""}" },
  "sumario_executivo": "resumo da evolução com base nas sessões",
  "desenvolvimento_academico": "progresso nas habilidades acadêmicas trabalhadas nas sessões",
  "desenvolvimento_social": "evolução social e comportamental observada",
  "adaptacoes_aplicadas": "recursos e estratégias utilizados nas sessões de AEE",
  "pontos_positivos": ["conquista 1", "conquista 2", "conquista 3"],
  "areas_de_atencao": ["área que ainda precisa de atenção 1", "área 2"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "metas_proxima_periodo": ["meta 1 com prazo", "meta 2 com prazo"],
  "base_legal": "Decreto 7.611/2011; Res. CNE/CEB 4/2009; PNEE/MEC 2008",
  "observacoes_finais": "observações finais com frequência: ${pct !== null ? `${pct}% (${presencas}/${totalSessoes} sessões)` : "não registrada"}"
}`;

    const responseEvolucao = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Especialista em educação inclusiva brasileira. Retorne sempre JSON válido." },
        { role: "user", content: promptEvolucao }
      ],
      temperature: 0.5, max_tokens: 2000
    });

    const cleanEvolucao = responseEvolucao.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    let reportData;
    try { reportData = JSON.parse(cleanEvolucao); }
    catch { throw new Error("A IA retornou uma resposta inválida. Tente novamente."); }

    const novoContent = { report: reportData, metrics: { totalSessoes, presencas, frequenciaAEE: pct } };

    const { data: existente } = await supabase.from("reports").select("id")
      .eq("student_id", studentId).eq("report_type", "evolucao").maybeSingle();

    let saved;
    if (existente) {
      const { data } = await supabase.from("reports")
        .update({ content: novoContent, period: periodo || "Período letivo atual", aprovado: false })
        .eq("id", existente.id).select().single();
      saved = data;
    } else {
      const { data } = await supabase.from("reports").insert([{
        school_id: student.school_id, student_id: studentId, generated_by: userId,
        report_type: "evolucao", period: periodo || "Período letivo atual",
        aprovado: false, content: novoContent
      }]).select().single();
      saved = data;
    }
    if (userId) await incrementarRelatorio(userId);
    return { reportId: saved?.id, student, metrics: { totalSessoes, presencas, frequenciaAEE: pct }, report: reportData };
  }

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

  // UPSERT: sobrescreve relatório existente do mesmo tipo para este aluno
  const novoContent = {
    report: reportData,
    metrics: { mediaNota, frequencia, totalAvaliacoes, totalAulas: aulasDoAluno.length }
  };

  const { data: existente } = await supabase
    .from("reports").select("id")
    .eq("student_id", studentId).eq("report_type", tipo).maybeSingle();

  let saved, saveError;
  if (existente) {
    const res = await supabase.from("reports")
      .update({ content: novoContent, period: periodo || "Período letivo atual", aprovado: false })
      .eq("id", existente.id).select().single();
    saved = res.data; saveError = res.error;
  } else {
    const res = await supabase.from("reports").insert([{
      school_id: student.school_id,
      student_id: studentId,
      generated_by: userId,
      report_type: tipo,
      period: periodo || "Período letivo atual",
      aprovado: false,
      content: novoContent
    }]).select().single();
    saved = res.data; saveError = res.error;
  }

  if (saveError) {
    console.error("❌ Erro ao salvar relatório:", saveError.message);
  } else {
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