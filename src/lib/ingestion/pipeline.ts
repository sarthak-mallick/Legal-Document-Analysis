import { chunkDocument } from "@/lib/ingestion/chunker";
import { detectDocumentType } from "@/lib/ingestion/doc-type-detector";
import { storeDocumentChunks } from "@/lib/ingestion/embedder";
import { parsePdf } from "@/lib/ingestion/pdf-parser";
import { generateTableDescriptions } from "@/lib/ingestion/table-describer";
import { extractTables } from "@/lib/ingestion/table-extractor";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface IngestDocumentInput {
  buffer: Buffer;
  documentId: string;
}

export interface IngestDocumentResult {
  documentType: string;
  chunkCount: number;
  tableCount: number;
}

// This helper runs the full ingestion flow for one uploaded document.
export async function ingestDocument({
  buffer,
  documentId,
}: IngestDocumentInput): Promise<IngestDocumentResult> {
  console.info("[ingestion] Starting document pipeline", { documentId });

  const supabase = createSupabaseAdminClient();

  try {
    // Step 1: Parse PDF
    const parsedDocument = await parsePdf(buffer);

    // Step 2: Extract tables
    const tables = await extractTables(buffer, parsedDocument);

    // Step 3: Chunk document (table-aware)
    const rawChunks = await chunkDocument(parsedDocument, tables);

    // Step 4: Generate NL descriptions for table chunks
    const chunks = await generateTableDescriptions(rawChunks);

    // Step 5: Detect document type
    const typeResult = await detectDocumentType(parsedDocument);

    await supabase
      .from("documents")
      .update({
        document_type: typeResult.documentType,
        page_count: parsedDocument.metadata.pageCount,
        upload_status: "processing",
      })
      .eq("id", documentId);

    // Step 6: Embed and store chunks
    await storeDocumentChunks(documentId, chunks);

    const { error } = await supabase
      .from("documents")
      .update({
        document_type: typeResult.documentType,
        page_count: parsedDocument.metadata.pageCount,
        upload_status: "ready",
      })
      .eq("id", documentId);

    if (error) {
      console.error("[ingestion] Failed to finalize document status", error);
      throw new Error(error.message);
    }

    const tableCount = chunks.filter((c) => c.chunkType === "table").length;

    console.info("[ingestion] Completed document pipeline", {
      documentId,
      documentType: typeResult.documentType,
      chunkCount: chunks.length,
      tableCount,
    });

    return {
      documentType: typeResult.documentType,
      chunkCount: chunks.length,
      tableCount,
    };
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
