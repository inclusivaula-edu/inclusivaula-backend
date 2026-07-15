import { supabase } from "../config/supabase.js";
import { audit } from "../services/audit.service.js";
import { internalError } from "../utils/sanitize.js";
import { runNexus7Extracao } from "../nexus7/nexus7-extracao.js";

// Extrai dados estruturados de um documento legado (PEI antigo/laudo) via IA
export const extractLegacyController = async (req, res) => {
  try {
    const { texto } = req.body;
    if (!texto || String(texto).trim().length < 100) {
      return res.status(400).json({ success: false, error: "Envie o texto do documento (mínimo 100 caracteres)." });
    }

    const { data: student } = await supabase
      .from("students").select("*")
      .eq("id", req.params.id)
      .eq("school_id", req.schoolId)
      .single();
    if (!student) return res.status(404).json({ success: false, error: "Aluno não encontrado" });

    const extraido = await runNexus7Extracao({ textoLegado: texto, student });

    await audit({
      req,
      action: "student.extract_legacy",
      resourceType: "student",
      resourceId: student.id,
      metadata: { chars: String(texto).length }
    });

    return res.json({ success: true, data: extraido });
  } catch (error) {
    console.error("extractLegacy:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};

const MAX_LINHAS = 500;

// Sinônimos comuns em planilhas de secretaria → valores do sistema
const NEE_MAP = {
  "tea": "Autismo", "autista": "Autismo", "autismo": "Autismo", "espectro autista": "Autismo",
  "tdah": "TDAH", "hiperatividade": "TDAH",
  "dislexia": "Dislexia",
  "di": "Deficiência intelectual", "deficiencia intelectual": "Deficiência intelectual", "deficiência intelectual": "Deficiência intelectual",
  "baixa visao": "Baixa visão", "baixa visão": "Baixa visão", "deficiencia visual": "Baixa visão", "deficiência visual": "Baixa visão", "dv": "Baixa visão",
  "deficiencia auditiva": "Deficiência auditiva", "deficiência auditiva": "Deficiência auditiva", "surdez": "Deficiência auditiva", "da": "Deficiência auditiva",
  "nenhuma": null, "nao": null, "não": null, "-": null, "": null
};

function normalizarNEE(valor) {
  if (valor === null || valor === undefined) return null;
  const chave = String(valor).trim().toLowerCase();
  if (chave in NEE_MAP) return NEE_MAP[chave];
  const texto = String(valor).trim();
  return texto || null; // valor não mapeado é preservado como veio (ex: "Síndrome de Down")
}

function normalizarData(valor) {
  if (!valor) return null;
  let s = String(valor).trim();
  // Data serial do Excel (dias desde 1900) — ex: "39974.99967592592"
  if (/^\d+([.,]\d+)?$/.test(s)) {
    const serial = parseFloat(s.replace(",", "."));
    if (serial >= 1000 && serial <= 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
      return d.toISOString().split("T")[0];
    }
  }
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);          // ISO
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); // dd/mm/aaaa
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/);  // dd/mm/aa
  if (m) {
    const ano = Number(m[3]) > 30 ? `19${m[3]}` : `20${m[3]}`;
    return `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return undefined; // formato irreconhecível (diferente de "vazio")
}

export const importStudentsController = async (req, res) => {
  try {
    const { alunos, confirmacaoLGPD } = req.body;

    if (confirmacaoLGPD !== true) {
      return res.status(400).json({
        success: false,
        error: "É necessário declarar que a escola possui base legal para o tratamento dos dados dos alunos (LGPD)."
      });
    }
    if (!Array.isArray(alunos) || alunos.length === 0) {
      return res.status(400).json({ success: false, error: "Nenhum aluno enviado." });
    }
    if (alunos.length > MAX_LINHAS) {
      return res.status(400).json({ success: false, error: `Máximo de ${MAX_LINHAS} alunos por importação. Divida a planilha.` });
    }

    // Alunos já existentes na escola, para detectar duplicados
    const { data: existentes } = await supabase
      .from("students")
      .select("full_name, birth_date")
      .eq("school_id", req.schoolId);
    const chavesExistentes = new Set(
      (existentes || []).map(e => `${(e.full_name || "").trim().toLowerCase()}|${e.birth_date || ""}`)
    );

    const validos = [];
    const rejeitados = [];
    const chavesNoArquivo = new Set();

    alunos.forEach((linha, i) => {
      const numLinha = i + 2; // +1 do cabeçalho, +1 de índice 0
      const nome = String(linha.full_name || "").trim();
      if (!nome || nome.length < 3) {
        rejeitados.push({ linha: numLinha, nome: nome || "(vazio)", motivo: "Nome ausente ou muito curto" });
        return;
      }

      const nascimento = normalizarData(linha.birth_date);
      if (nascimento === undefined) {
        rejeitados.push({ linha: numLinha, nome, motivo: `Data de nascimento inválida: "${linha.birth_date}" (use dd/mm/aaaa)` });
        return;
      }

      const chave = `${nome.toLowerCase()}|${nascimento || ""}`;
      if (chavesExistentes.has(chave)) {
        rejeitados.push({ linha: numLinha, nome, motivo: "Aluno já cadastrado na escola (mesmo nome e nascimento)" });
        return;
      }
      if (chavesNoArquivo.has(chave)) {
        rejeitados.push({ linha: numLinha, nome, motivo: "Duplicado dentro da própria planilha" });
        return;
      }
      chavesNoArquivo.add(chave);

      validos.push({
        school_id: req.schoolId,
        created_by: req.user?.id || null,
        full_name: nome.substring(0, 200),
        birth_date: nascimento,
        grade: String(linha.grade || "").trim().substring(0, 50) || null,
        turma: String(linha.turma || "").trim().substring(0, 50) || null,
        disability_type: normalizarNEE(linha.disability_type),
        guardian_name: String(linha.guardian_name || "").trim().substring(0, 200) || null,
        guardian_phone: String(linha.guardian_phone || "").trim().substring(0, 30) || null,
        notes: String(linha.notes || "").trim().substring(0, 1000) || null
      });
    });

    let inseridos = 0;
    if (validos.length > 0) {
      const { data, error } = await supabase.from("students").insert(validos).select("id");
      if (error) throw new Error(error.message);
      inseridos = data?.length || 0;
    }

    await audit({
      req,
      action: "student.import",
      resourceType: "student",
      metadata: { total_enviados: alunos.length, inseridos, rejeitados: rejeitados.length }
    });

    return res.json({ success: true, data: { inseridos, rejeitados } });
  } catch (error) {
    console.error("importStudents:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
