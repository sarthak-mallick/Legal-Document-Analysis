import { chunkDocument } from "@/lib/ingestion/chunker";
import { storeDocumentChunks } from "@/lib/ingestion/embedder";
import { parsePdf } from "@/lib/ingestion/pdf-parser";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface IngestDocumentInput {
  buffer: Buffer;
  documentId: string;
}

// This helper runs the full Week 1 ingestion flow for one uploaded document.
export async function ingestDocument({ buffer, documentId }: IngestDocumentInput) {
  console.info("[ingestion] Starting document pipeline", { documentId });

  const supabase = createSupabaseAdminClient();

  try {
    const parsedDocument = await parsePdf(buffer);
    const chunks = await chunkDocument(parsedDocument);

    await supabase
      .from("documents")
      .update({
        page_count: parsedDocument.metadata.pageCount,
        upload_status: "processing",
      })
      .eq("id", documentId);

    await storeDocumentChunks(documentId, chunks);

    const { error } = await supabase
      .from("documents")
      .update({
        page_count: parsedDocument.metadata.pageCount,
        upload_status: "ready",
      })
      .eq("id", documentId);

    if (error) {
      console.error("[ingestion] Failed to finalize document status", error);
      throw new Error(error.message);
    }

    console.info("[ingestion] Completed document pipeline", { documentId });
  } catch (error) {
    console.error("[ingestion] Document pipeline failed", error);

    await supabase
      .from("documents")
      .update({
        upload_status: "error",
      })
      .eq("id", documentId);

    throw error;
  }
}

