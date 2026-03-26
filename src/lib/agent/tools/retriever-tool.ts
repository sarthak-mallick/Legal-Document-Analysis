import { matchDocumentChunks } from "@/lib/langchain/vectorstore";
import type { RetrievedChunk } from "@/types/conversation";

const SIMILARITY_THRESHOLD = 0.7;

// Retrieve the most relevant document chunks for a query using vector search.
export async function retrieveChunks(
  query: string,
  documentIds: string[],
  matchCount = 5,
): Promise<RetrievedChunk[]> {
  console.info("[retriever] Searching for relevant chunks", {
    query: query.slice(0, 80),
    documentIds,
    matchCount,
  });

  const results = await matchDocumentChunks(query, {
    documentIds: documentIds.length > 0 ? documentIds : undefined,
    matchCount,
  });

  const filtered = (results as RetrievedChunk[]).filter(
    (chunk) => chunk.similarity >= SIMILARITY_THRESHOLD,
  );

  console.info("[retriever] Retrieved chunks", {
    total: results.length,
    aboveThreshold: filtered.length,
  });

  return filtered;
}
