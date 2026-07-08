/**
 * Indexa a BNCC COMPLETA na base RAG a partir da planilha oficial do MEC.
 *
 * Como usar:
 * 1. Acesse https://downloadbncc.mec.gov.br/ no navegador
 * 2. Selecione todas as etapas (EI, EF, EM) e todos os componentes
 * 3. Exporte a planilha e salve como CSV (UTF-8) — ex: bncc-completa.csv
 * 4. Rode: node --env-file=.env src/nexus7/rag-seed-bncc.js caminho/para/bncc-completa.csv
 *
 * O script:
 * - Detecta automaticamente as colunas de código e descrição da habilidade
 * - Pula códigos que já existem na base (pode rodar de novo sem duplicar)
 * - Indexa em lotes de 40 com embeddings (text-embedding-3-small)
 */
import { readFileSync } from "fs";
import { supabase } from "../config/supabase.js";
import { indexDocumentsBatch } from "./rag.service.js";

const CODE_RE = /^(EI\d{2}[A-Z]{2}\d{2}|EF\d{2}[A-Z]{2}\d{2,3}|EM13[A-Z]{3}\d{3})$/;

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === "," || c === ";") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(f => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field || row.length) { row.push(field); if (row.some(f => f.trim())) rows.push(row); }
  return rows;
}

function detectColumns(rows) {
  // Procura a coluna onde a maioria dos valores bate com o padrão de código BNCC
  const sample = rows.slice(0, 200);
  const nCols = Math.max(...sample.map(r => r.length));
  let codeCol = -1, bestHits = 0;
  for (let c = 0; c < nCols; c++) {
    const hits = sample.filter(r => CODE_RE.test((r[c] || "").trim())).length;
    if (hits > bestHits) { bestHits = hits; codeCol = c; }
  }
  if (codeCol === -1 || bestHits < 3) throw new Error("Não encontrei coluna de códigos BNCC no arquivo.");

  // Descrição = coluna com texto mais longo em média (excluindo a de código)
  let descCol = -1, bestLen = 0;
  for (let c = 0; c < nCols; c++) {
    if (c === codeCol) continue;
    const avg = sample.reduce((s, r) => s + ((r[c] || "").length), 0) / sample.length;
    if (avg > bestLen) { bestLen = avg; descCol = c; }
  }
  return { codeCol, descCol };
}

function serieFromCode(code) {
  if (code.startsWith("EM13")) return "Ensino Médio";
  if (code.startsWith("EI")) return "Educação Infantil";
  const ano = code.substring(2, 4);
  if (/^\d{2}$/.test(ano)) {
    const n = Number(ano);
    if (n >= 1 && n <= 9) return `${n}º ano`;
    return `${ano.charAt(0)}º ao ${ano.charAt(1)}º ano`; // faixas: EF15, EF35, EF69, EF89
  }
  return "";
}

const COMPONENTES = {
  MA: "Matemática", LP: "Língua Portuguesa", CI: "Ciências", HI: "História",
  GE: "Geografia", AR: "Artes", EF: "Educação Física", LI: "Língua Inglesa",
  ER: "Ensino Religioso", CO: "Computação",
  LGG: "Linguagens", MAT: "Matemática", CNT: "Ciências da Natureza", CHS: "Ciências Humanas"
};

function componenteFromCode(code) {
  const m = code.match(/^E[FIM]\d{2}([A-Z]{2,3})\d/);
  return m ? (COMPONENTES[m[1]] || m[1]) : "";
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: node --env-file=.env src/nexus7/rag-seed-bncc.js <arquivo.csv>");
    process.exit(1);
  }

  const rows = parseCSV(readFileSync(file, "utf8"));
  const { codeCol, descCol } = detectColumns(rows);
  console.log(`Colunas detectadas — código: ${codeCol}, descrição: ${descCol}. Linhas: ${rows.length}`);

  // Habilidades únicas do arquivo
  const habilidades = new Map();
  for (const r of rows) {
    const code = (r[codeCol] || "").trim();
    const desc = (r[descCol] || "").trim();
    if (CODE_RE.test(code) && desc.length > 20 && !habilidades.has(code)) {
      habilidades.set(code, desc);
    }
  }
  console.log(`Habilidades válidas no arquivo: ${habilidades.size}`);

  // Pula as que já existem
  const { data: existentes } = await supabase
    .from("rag_documents").select("title").eq("source", "BNCC");
  const jaIndexadas = new Set((existentes || []).map(d => d.title));
  const novas = [...habilidades].filter(([code]) => !jaIndexadas.has(code));
  console.log(`Já na base: ${jaIndexadas.size}. Novas a indexar: ${novas.length}`);

  const docs = novas.map(([code, desc]) => ({
    source: "BNCC",
    category: "habilidade",
    title: code,
    content: desc,
    metadata: { serie: serieFromCode(code), area: componenteFromCode(code), componente: code.match(/^E[FIM]\d{2}([A-Z]{2,3})/)?.[1] || "" }
  }));

  const LOTE = 40;
  for (let i = 0; i < docs.length; i += LOTE) {
    const batch = docs.slice(i, i + LOTE);
    await indexDocumentsBatch(batch);
    console.log(`Indexadas ${Math.min(i + LOTE, docs.length)}/${docs.length}`);
  }

  console.log("✅ Concluído.");
}

main().catch(err => { console.error("❌", err.message); process.exit(1); });
