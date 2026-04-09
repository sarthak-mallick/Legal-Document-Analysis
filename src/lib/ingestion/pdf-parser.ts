import { extractText, getMeta } from "unpdf";

import type { ParsedDocument } from "@/lib/ingestion/types";

// This helper converts raw PDF bytes into page-aware text blocks for chunking.
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  console.info("[ingestion] Parsing PDF buffer");

  try {
    const uint8 = new Uint8Array(buffer);
    const { totalPages, text: pageTexts } = await extractText(uint8, { mergePages: false });

    let title: string | undefined;
    try {
      const { info } = await getMeta(uint8);
      title = info?.Title as string | undefined;
    } catch {
      // Metadata extraction is best-effort
    }

    console.info("[ingestion] Parsed PDF successfully", {
      pageCount: totalPages,
    });

    return {
      metadata: {
        pageCount: totalPages,
        title,
      },
      pages: pageTexts
        .map((text, i) => ({
          pageNumber: i + 1,
          text: text.trim(),
        }))
        .filter((p) => p.text.length > 0),
    };
  } catch (error) {
    console.error("[ingestion] PDF parsing failed", error);
    throw new Error("Unable to parse PDF. Confirm the file is a readable, unprotected PDF.");
  }
}
