import { embedQuery } from "@/lib/langchain/embeddings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// This helper runs the spec-defined pgvector RPC against stored document chunks.
export async function matchDocumentChunks(
  query: string,
  options?: {
    documentIds?: string[];
    matchCount?: number;
  },
) {
  console.info("[vectorstore] Running document chunk match", {
    matchCount: options?.matchCount ?? 5,
  });

  const supabase = createSupabaseAdminClient();
  const queryEmbedding = await embedQuery(query);
  const { data, error } = await supabase.rpc("match_chunks", {
    filter_document_ids: options?.documentIds ?? null,
    match_count: options?.matchCount ?? 5,
    query_embedding: queryEmbedding,
  });

  if (error) {
    console.error("[vectorstore] Chunk match failed", error);
    throw new Error(error.message);
  }

  return data ?? [];
}
