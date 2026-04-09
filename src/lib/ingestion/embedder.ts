import { getEmbeddings } from "@/lib/langchain/embeddings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DocumentChunkInput } from "@/lib/ingestion/types";

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;

// This helper pauses between embedding batches to reduce provider rate pressure.
async function sleep(durationMs: number) {
  await new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

// This helper writes chunk embeddings and metadata into Supabase.
export async function storeDocumentChunks(documentId: string, chunks: DocumentChunkInput[]) {
  console.info("[ingestion] Storing document chunks", {
    chunkCount: chunks.length,
    documentId,
  });

  const embeddings = getEmbeddings();
  const supabase = createSupabaseAdminClient();

  // Filter out chunks with empty content — the embedding API returns
  // zero-dimension vectors for blank strings, which Supabase rejects.
  const validChunks = chunks.filter((chunk) => chunk.content.trim().length > 0);

  for (let index = 0; index < validChunks.length; index += BATCH_SIZE) {
    const batch = validChunks.slice(index, index + BATCH_SIZE);

    try {
      const contents = batch.map((chunk) => chunk.content);
      const vectors = await embeddings.embedDocuments(contents);
      console.info("[ingestion] Embedding batch result", {
        batchIndex: index,
        inputCount: contents.length,
        vectorCount: vectors.length,
        dimensions: vectors.map((v) => v?.length ?? 0),
        sampleContentLengths: contents.map((c) => c.length),
      });

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

    if (index + BATCH_SIZE < chunks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.info("[ingestion] Stored document chunks successfully", { documentId });
}
