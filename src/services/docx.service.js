import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

/**
 * Exportação em Word (.docx) editável para documentos pedagógicos
 * (PEI, PDI, PAEE/AEE, Estudo de Caso). O professor edita antes de protocolar.
 *
 * Renderização genérica: percorre o JSON do resultado transformando
 * chaves em títulos, strings em parágrafos e arrays em listas.
 */

const AZUL = "2B9EC3";
const CINZA = "5F5E5A";

// snake_case → Título Legível
function rotulo(chave) {
  const especiais = {
    aee: "AEE — Atendimento Educacional Especializado",
    pei: "PEI", pdi: "PDI", nee: "NEE", bncc: "BNCC",
    identificacao: "Identificação",
    diagnostico_pedagogico: "Diagnóstico Pedagógico",
    contexto_biopsicossocial: "Contexto Biopsicossocial",
    barreiras_identificadas: "Barreiras Identificadas",
    necessidades_de_apoio: "Necessidades de Apoio",
    tecnologia_assistiva: "Tecnologia Assistiva",
    fisicas_arquitetonicas: "Físicas / Arquitetônicas"
  };
  if (especiais[chave]) return especiais[chave];
  return chave
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

function itemComoTexto(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item;
  if (typeof item !== "object") return String(item);
  // Objetos comuns: {area, meta}, {recurso, finalidade, como_obter}, {profissional, papel}...
  return Object.values(item).filter(v => typeof v === "string" && v.trim()).join(" — ");
}

function renderValor(chave, valor, nivel, out) {
  if (valor === null || valor === undefined || valor === "") return;

  if (typeof valor === "string" || typeof valor === "number" || typeof valor === "boolean") {
    out.push(new Paragraph({
      children: [
        new TextRun({ text: `${rotulo(chave)}: `, bold: true, color: CINZA }),
        new TextRun({ text: typeof valor === "boolean" ? (valor ? "Sim" : "Não") : String(valor) })
      ],
      spacing: { after: 80 }
    }));
    return;
  }

  if (Array.isArray(valor)) {
    if (valor.length === 0) return;
    out.push(new Paragraph({
      children: [new TextRun({ text: rotulo(chave), bold: true, color: AZUL })],
      spacing: { before: 120, after: 60 }
    }));
    for (const item of valor) {
      const texto = itemComoTexto(item);
      if (texto) out.push(new Paragraph({ text: texto, bullet: { level: 0 }, spacing: { after: 40 } }));
    }
    return;
  }

  // Objeto: título de seção + conteúdo recursivo
  out.push(new Paragraph({
    text: rotulo(chave),
    heading: nivel === 0 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 }
  }));
  for (const [k, v] of Object.entries(valor)) {
    renderValor(k, v, nivel + 1, out);
  }
}

/**
 * Gera o buffer .docx a partir do resultado JSON de um documento pedagógico.
 * @param {string} titulo    - ex: "PEI — Plano Educacional Individualizado"
 * @param {Object} resultado - JSON gerado pelo Nexus7
 * @param {Object} meta      - { aluno, escola, periodo }
 */
export async function gerarDocx(titulo, resultado, meta = {}) {
  const corpo = [];

  corpo.push(new Paragraph({
    text: titulo,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 }
  }));

  const sub = [
    meta.aluno ? `Aluno: ${meta.aluno}` : "",
    meta.escola ? `Escola: ${meta.escola}` : "",
    meta.periodo ? `Período: ${meta.periodo}` : ""
  ].filter(Boolean).join("   |   ");
  if (sub) {
    corpo.push(new Paragraph({
      children: [new TextRun({ text: sub, color: CINZA, size: 20 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 }
    }));
  }

  for (const [chave, valor] of Object.entries(resultado || {})) {
    renderValor(chave, valor, 0, corpo);
  }

  corpo.push(new Paragraph({
    children: [new TextRun({
      text: "Documento gerado pela InclusivAula — revise e complemente antes de protocolar.",
      italics: true, color: CINZA, size: 18
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 360 }
  }));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } } // 11pt, fonte sem serifa (acessível)
    },
    sections: [{ children: corpo }]
  });

  return Packer.toBuffer(doc);
}

// Envia o .docx como download na resposta HTTP
export async function enviarDocx(res, titulo, resultado, meta, nomeArquivo) {
  const buffer = await gerarDocx(titulo, resultado, meta);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
  res.send(buffer);
}
