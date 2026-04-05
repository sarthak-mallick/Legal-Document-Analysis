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

  for (let index = 0; index < chunks.length; index += BATCH_SIZE) {
    const batch = chunks.slice(index, index + BATCH_SIZE);

    try {
      const vectors = await embeddings.embedDocuments(batch.map((chunk) => chunk.content));
      const rows = batch.map((chunk, batchIndex) => ({
        content: chunk.content,
        chunk_index: chunk.chunkIndex,
        chunk_type: chunk.chunkType,
        document_id: documentId,
        embedding: vectors[batchIndex],
        metadata: chunk.metadata,
        page_number: chunk.pageNumber,
        section_title: chunk.sectionTitle,
      }));
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
