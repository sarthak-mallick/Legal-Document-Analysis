import { createRequire } from "node:module";

import type { ParsedDocument } from "@/lib/ingestion/types";

// Load pdf-parse v1 via native require to avoid Turbopack bundling issues
// with pdfjs-dist's worker system.
const nativeRequire = createRequire(`${process.cwd()}/package.json`);
const pdfParse = nativeRequire("pdf-parse") as (
  buffer: Buffer,
) => Promise<{ numpages: number; info: Record<string, string>; text: string }>;

// This helper converts raw PDF bytes into page-aware text blocks for chunking.
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  console.info("[ingestion] Parsing PDF buffer");

  try {
    const data = await pdfParse(buffer);

    console.info("[ingestion] Parsed PDF successfully", {
      pageCount: data.numpages,
    });

    return {
      metadata: {
        pageCount: data.numpages,
        title: data.info?.Title,
      },
      // v1 doesn't support per-page extraction; pass full text as page 1.
      // The chunker splits by headings/size anyway, so this is fine.
      pages: [
        {
          pageNumber: 1,
          text: data.text.trim(),
        },
      ],
    };
  } catch (error) {
    console.error("[ingestion] PDF parsing failed", error);
    throw new Error("Unable to parse PDF. Confirm the file is a readable, unprotected PDF.");
  }
}
