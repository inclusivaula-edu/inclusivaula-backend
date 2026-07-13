import { supabase } from "../config/supabase.js";
import { generateAlerts } from "./alert.service.js";
import { generatePredictions } from "./prediction.service.js";

/**
 * Serviço de gestão — agregados por nível hierárquico.
 *
 * Padrão de escopo (obrigatório para qualquer novo agregado):
 *  - escola  → sempre filtrado por school_id
 *  - rede    → sempre filtrado por network_id (via escolas da rede)
 *  - global  → apenas contagens anônimas, sem dados de titulares (MEC)
 *
 * Este serviço é a fundação dos futuros agregados analíticos ("bigdata"):
 * novos indicadores entram aqui, nunca em consultas soltas sem escopo.
 */

async function contar(tabela, filtros = {}) {
  let q = supabase.from(tabela).select("id", { count: "exact", head: true });
  for (const [col, val] of Object.entries(filtros)) {
    q = Array.isArray(val) ? q.in(col, val) : q.eq(col, val);
  }
  const { count, error } = await q;
  if (error) {
    console.error(`contar(${tabela}):`, error.message);
    return 0;
  }
  return count || 0;
}

// ── NÍVEL ESCOLA (coordenador+) ─────────────────────────────────

export async function getSchoolOverview(schoolId) {
  const [
    alunos, professores, turmas,
    aulas30d, atividadesTotal,
    { data: attendance }, { data: evaluations }, { data: nee },
    { data: peiDocs }, { data: aeeDocs }, { data: caseDocs }
  ] = await Promise.all([
    contar("students", { school_id: schoolId }),
    contar("teachers", { school_id: schoolId }),
    contar("classes", { school_id: schoolId }),
    supabase.from("lessons").select("id", { count: "exact", head: true })
      .eq("school_id", schoolId).eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .then(r => r.count || 0),
    contar("activities", { school_id: schoolId }),
    supabase.from("attendance").select("status").eq("school_id", schoolId),
    supabase.from("evaluations").select("score, max_score").eq("school_id", schoolId),
    supabase.from("students").select("id, full_name, disability_type").eq("school_id", schoolId),
    supabase.from("pei_documents").select("student_id, doc_type, status, aprovado").eq("school_id", schoolId),
    supabase.from("aee_documents").select("student_id, status, aprovado").eq("school_id", schoolId),
    supabase.from("case_studies").select("student_id, status, aprovado").eq("school_id", schoolId)
  ]);

  // Separa PEI de PDI (mesma tabela, doc_type distingue)
  const soPei = (peiDocs || []).filter(d => (d.doc_type || "pei") === "pei");
  const soPdi = (peiDocs || []).filter(d => d.doc_type === "pdi");
  const peiTotal = soPei.length;
  const peiConcluidos = soPei.filter(d => d.status === "completed").length;
  const pdiTotal = soPdi.length;
  const pdiConcluidos = soPdi.filter(d => d.status === "completed").length;
  const aeeTotal = (aeeDocs || []).length;
  const aeeConcluidos = (aeeDocs || []).filter(d => d.status === "completed").length;
  const estudoTotal = (caseDocs || []).length;
  const estudoConcluidos = (caseDocs || []).filter(d => d.status === "completed").length;

  // Pendências documentais: aluno com NEE deve ter estudo de caso, PEI e PAEE
  const temDoc = (docs, studentId) =>
    docs.some(d => d.student_id === studentId && d.status === "completed");
  const alunosNEE = (nee || []).filter(s => s.disability_type);
  const pendencias = alunosNEE.map(s => ({
    id: s.id,
    nome: s.full_name,
    nee: s.disability_type,
    tem_estudo_caso: temDoc(caseDocs || [], s.id),
    tem_pei: temDoc(soPei, s.id),
    tem_paee: temDoc(aeeDocs || [], s.id)
  }));
  const pendenciasResumo = {
    total_nee: alunosNEE.length,
    sem_estudo_caso: pendencias.filter(p => !p.tem_estudo_caso).length,
    sem_pei: pendencias.filter(p => !p.tem_pei).length,
    sem_paee: pendencias.filter(p => !p.tem_paee).length,
    alunos: pendencias.sort((a, b) =>
      (a.tem_estudo_caso + a.tem_pei + a.tem_paee) - (b.tem_estudo_caso + b.tem_pei + b.tem_paee)
    )
  };

  const totalPresencas = (attendance || []).filter(a => a.status === "present").length;
  const taxaFrequencia = attendance?.length
    ? Math.round((totalPresencas / attendance.length) * 100)
    : null;

  // Normaliza notas para escala 0-10 antes de calcular a média
  const notas = (evaluations || [])
    .filter(e => e.score !== null)
    .map(e => (Number(e.score) / (Number(e.max_score) || 10)) * 10);
  const mediaNotas = notas.length
    ? Number((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1))
    : null;

  const neePorTipo = {};
  for (const s of nee || []) {
    const tipo = s.disability_type || "Não informado";
    neePorTipo[tipo] = (neePorTipo[tipo] || 0) + 1;
  }

  const [alertas, predicoes] = await Promise.all([
    generateAlerts(schoolId).catch(err => { console.error("alerts:", err.message); return []; }),
    generatePredictions(schoolId).catch(err => { console.error("predictions:", err.message); return []; })
  ]);

  return {
    totais: { alunos, professores, turmas, aulas_30d: aulas30d, atividades: atividadesTotal },
    frequencia: { taxa: taxaFrequencia, registros: attendance?.length || 0 },
    desempenho: { media_notas: mediaNotas, avaliacoes: notas.length },
    documentos: {
      pei: { total: peiTotal, concluidos: peiConcluidos },
      pdi: { total: pdiTotal, concluidos: pdiConcluidos },
      aee: { total: aeeTotal, concluidos: aeeConcluidos },
      estudo_caso: { total: estudoTotal, concluidos: estudoConcluidos }
    },
    pendencias_documentais: pendenciasResumo,
    nee_por_tipo: neePorTipo,
    alertas_pedagogicos: alertas,
    predicoes
  };
}

// ── NÍVEL REDE (secretaria+) ────────────────────────────────────

export async function getNetworkOverview(networkId) {
  const { data: network } = await supabase
    .from("networks").select("id, name, type, city, state").eq("id", networkId).single();
  if (!network) return null;

  const { data: schools } = await supabase
    .from("schools").select("id, name, city").eq("network_id", networkId).order("name");

  const escolas = await Promise.all((schools || []).map(async (school) => {
    const [alunos, professores, peiConcluidos, aeeConcluidos, { data: attendance }] = await Promise.all([
      contar("students", { school_id: school.id }),
      contar("teachers", { school_id: school.id }),
      contar("pei_documents", { school_id: school.id, status: "completed" }),
      contar("aee_documents", { school_id: school.id, status: "completed" }),
      supabase.from("attendance").select("status").eq("school_id", school.id)
    ]);

    const presentes = (attendance || []).filter(a => a.status === "present").length;
    return {
      id: school.id,
      nome: school.name,
      cidade: school.city,
      alunos,
      professores,
      pei_concluidos: peiConcluidos,
      aee_concluidos: aeeConcluidos,
      taxa_frequencia: attendance?.length ? Math.round((presentes / attendance.length) * 100) : null
    };
  }));

  return {
    rede: network,
    total_escolas: escolas.length,
    totais: {
      alunos: escolas.reduce((s, e) => s + e.alunos, 0),
      professores: escolas.reduce((s, e) => s + e.professores, 0),
      pei_concluidos: escolas.reduce((s, e) => s + e.pei_concluidos, 0),
      aee_concluidos: escolas.reduce((s, e) => s + e.aee_concluidos, 0)
    },
    escolas
  };
}

// ── NÍVEL GLOBAL (mec) — apenas contagens anônimas ──────────────

export async function getGlobalOverview() {
  const [redes, escolas, alunos, professores, aulas, peis, aees] = await Promise.all([
    contar("networks"),
    contar("schools"),
    contar("students"),
    contar("teachers"),
    contar("lessons", { status: "completed" }),
    contar("pei_documents", { status: "completed" }),
    contar("aee_documents", { status: "completed" })
  ]);

  return {
    redes, escolas, alunos, professores,
    aulas_geradas: aulas, peis_concluidos: peis, aees_concluidos: aees
  };
}
