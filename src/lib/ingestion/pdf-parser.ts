import { PDFParse } from "pdf-parse";

import type { ParsedDocument } from "@/lib/ingestion/types";

// This helper converts raw PDF bytes into page-aware text blocks for chunking.
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  console.info("[ingestion] Parsing PDF buffer");

  const parser = new PDFParse({ data: buffer });

  try {
    const [info, text] = await Promise.all([parser.getInfo(), parser.getText()]);
    const pages = text.pages.length
      ? text.pages.map((page) => ({
          pageNumber: page.num,
          text: page.text.trim(),
        }))
      : [
          {
            pageNumber: 1,
            text: text.text.trim(),
          },
        ];

    console.info("[ingestion] Parsed PDF successfully", {
      pageCount: text.total,
    });

    return {
      metadata: {
        pageCount: text.total,
        title: info.info?.Title,
      },
      pages,
    };
  } catch (error) {
    console.error("[ingestion] PDF parsing failed", error);
    throw new Error("Unable to parse PDF. Confirm the file is a readable, unprotected PDF.");
  } finally {
    await parser.destroy();
  }
}
