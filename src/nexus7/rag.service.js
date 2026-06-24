import OpenAI from "openai";
import { supabase } from "../config/supabase.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getEmbedding(text) {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.substring(0, 8000)
  });
  return res.data[0].embedding;
}

/**
 * Insere um documento na base RAG com embedding.
 */
export async function indexDocument({ source, category, title, content, metadata = {} }) {
  const embedding = await getEmbedding(`${title}: ${content}`);
  const { error } = await supabase.from("rag_documents").insert([{
    source, category, title, content, metadata,
    embedding: JSON.stringify(embedding)
  }]);
  if (error) throw new Error(`RAG index error: ${error.message}`);
}

/**
 * Insere múltiplos documentos em batch.
 */
export async function indexDocumentsBatch(docs) {
  const results = [];
  for (const doc of docs) {
    const embedding = await getEmbedding(`${doc.title}: ${doc.content}`);
    results.push({
      ...doc,
      metadata: doc.metadata || {},
      embedding: JSON.stringify(embedding)
    });
  }
  const { error } = await supabase.from("rag_documents").insert(results);
  if (error) throw new Error(`RAG batch index error: ${error.message}`);
}

/**
 * Busca documentos relevantes por similaridade semântica.
 * @param {string} query - texto da busca
 * @param {Object} options
 * @param {number} options.limit - número de resultados (default 8)
 * @param {string} options.source - filtrar por fonte (BNCC, LDB, DSM-5, etc.)
 * @returns {Array} documentos rankeados por similaridade
 */
export async function searchRAG(query, { limit = 8, source = null } = {}) {
  const embedding = await getEmbedding(query);

  const { data, error } = await supabase.rpc("search_rag", {
    query_embedding: JSON.stringify(embedding),
    match_count: limit,
    filter_source: source
  });

  if (error) {
    console.error("RAG search error:", error.message);
    return [];
  }

  return (data || []).filter(d => d.similarity > 0.5);
}

/**
 * Busca contexto RAG relevante para uma geração do Nexus7.
 * Faz múltiplas buscas para cobrir BNCC, legislação e perfil de NEE.
 */
export async function getRAGContext({ tema, disciplina, serie, deficiencia }) {
  const queries = [
    { q: `${tema} ${disciplina} ${serie} BNCC habilidade`, source: "BNCC", limit: 5 },
    { q: `${deficiencia} adaptação inclusão educação especial`, source: null, limit: 4 },
    { q: `${deficiencia} DSM-5 CID-11 características`, source: null, limit: 3 }
  ];

  const results = await Promise.all(
    queries.map(({ q, source, limit }) => searchRAG(q, { limit, source }))
  );

  const allDocs = results.flat();

  if (allDocs.length === 0) return "";

  const seen = new Set();
  const unique = allDocs.filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  const sections = unique.map(d =>
    `[${d.source}${d.category ? ` / ${d.category}` : ""}] ${d.title}:\n${d.content}`
  );

  return `
═══════════════════════════════════════════════
CONTEXTO RECUPERADO DA BASE DE CONHECIMENTO (RAG)
═══════════════════════════════════════════════
Os documentos abaixo foram recuperados da base oficial e devem ser usados
como referência autoritativa. Use APENAS os códigos BNCC listados aqui.

${sections.join("\n\n")}
`;
}

/**
 * Retorna contagem de documentos na base RAG.
 */
export async function getRAGStats() {
  const { data } = await supabase
    .from("rag_documents")
    .select("source", { count: "exact", head: false });

  const stats = {};
  for (const row of (data || [])) {
    stats[row.source] = (stats[row.source] || 0) + 1;
  }
  return stats;
}
