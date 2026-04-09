import { embedTexts } from "@/lib/langchain/embeddings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DocumentChunkInput } from "@/lib/ingestion/types";

const BATCH_SIZE = 50;

// This helper writes chunk embeddings and metadata into Supabase.
export async function storeDocumentChunks(documentId: string, chunks: DocumentChunkInput[]) {
  console.info("[ingestion] Storing document chunks", {
    chunkCount: chunks.length,
    documentId,
  });

  const supabase = createSupabaseAdminClient();

  // Filter out chunks with empty content — the embedding API returns
  // zero-dimension vectors for blank strings, which Supabase rejects.
  const validChunks = chunks.filter((chunk) => chunk.content.trim().length > 0);

  for (let index = 0; index < validChunks.length; index += BATCH_SIZE) {
    const batch = validChunks.slice(index, index + BATCH_SIZE);

    try {
      const contents = batch.map((chunk) => chunk.content);
      const vectors = await embedTexts(contents);

      // Skip chunks whose embedding came back empty (API occasionally
      // returns zero-length vectors for very short or unusual input).
      const rows = batch
        .map((chunk, batchIndex) => ({
          content: chunk.content,
          chunk_index: chunk.chunkIndex,
          chunk_type: chunk.chunkType,
          document_id: documentId,
          embedding: vectors[batchIndex],
          metadata: chunk.metadata,
          page_number: chunk.pageNumber,
          section_title: chunk.sectionTitle,
        }))
        .filter((row) => row.embedding && row.embedding.length > 0);

      if (rows.length === 0) continue;

      const { error } = await supabase.from("document_chunks").insert(rows);

      if (error) {
        console.error("[ingestion] Failed to insert chunk batch", error);
        throw new Error(error.message);
      }
    } catch (error) {
      console.error("[ingestion] Embedding batch failed", error);
      throw new Error("Failed to generate or store embeddings for the uploaded document.");
    }
  }

  console.info("[ingestion] Stored document chunks successfully", { documentId });
}
