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

// Update the document's upload_status to reflect the current pipeline stage.
async function setStage(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  documentId: string,
  stage: string,
  extra: Record<string, unknown> = {},
) {
  await supabase
    .from("documents")
    .update({ upload_status: stage, ...extra })
    .eq("id", documentId);
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
    await setStage(supabase, documentId, "parsing");
    const parsedDocument = await parsePdf(buffer);

    // Step 2: Extract tables
    await setStage(supabase, documentId, "extracting_tables");
    const tables = await extractTables(buffer, parsedDocument);

    // Step 3: Chunk document (table-aware)
    await setStage(supabase, documentId, "chunking");
    const rawChunks = await chunkDocument(parsedDocument, tables);

    // Steps 4 & 5 run in parallel: table descriptions and type detection are independent
    const [chunks, typeResult] = await Promise.all([
      generateTableDescriptions(rawChunks),
      detectDocumentType(parsedDocument),
    ]);

    await setStage(supabase, documentId, "embedding", {
      document_type: typeResult.documentType,
      page_count: parsedDocument.metadata.pageCount,
    });

    // Step 6: Embed and store chunks
    await storeDocumentChunks(documentId, chunks);

    await setStage(supabase, documentId, "ready");

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

    await supabase.from("documents").update({ upload_status: "error" }).eq("id", documentId);

    throw error;
  }
}
