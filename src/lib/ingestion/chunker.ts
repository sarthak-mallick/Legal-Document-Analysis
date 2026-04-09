import { getNumberEnv } from "@/lib/env";
import type { DocumentChunkInput, ExtractedTable, ParsedDocument } from "@/lib/ingestion/types";

const CHUNK_SIZE = getNumberEnv("CHUNK_SIZE", 1000);
const CHUNK_OVERLAP = getNumberEnv("CHUNK_OVERLAP", 200);

// This helper guesses the closest section heading from the text preceding a chunk.
function detectSectionTitle(text: string) {
  const candidateLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = candidateLines.length - 1; index >= 0; index -= 1) {
    const line = candidateLines[index];
    const looksLikeHeading =
      /^[A-Z][A-Z\s\d\-&,]{5,}$/.test(line) ||
      /^\d+(\.\d+)*\s+[A-Z]/.test(line) ||
      /^section\s+\d+/i.test(line);

    if (looksLikeHeading) {
      return line;
    }
  }

  return null;
}

// This helper approximates recursive text splitting while preserving overlap between chunks.
function splitTextRecursively(text: string) {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const maxEnd = Math.min(cursor + CHUNK_SIZE, text.length);
    let splitIndex = maxEnd;
    const candidateWindow = text.slice(cursor, maxEnd);
    const lastParagraphBreak = candidateWindow.lastIndexOf("\n\n");
    const lastLineBreak = candidateWindow.lastIndexOf("\n");
    const lastSentenceBreak = Math.max(
      candidateWindow.lastIndexOf(". "),
      candidateWindow.lastIndexOf("? "),
      candidateWindow.lastIndexOf("! "),
    );
    const preferredBreak = [lastParagraphBreak, lastLineBreak, lastSentenceBreak].find(
      (index) => index > CHUNK_SIZE * 0.5,
    );

    if (preferredBreak) {
      splitIndex = cursor + preferredBreak + 1;
    }

    const chunkText = text.slice(cursor, splitIndex).trim();

    if (chunkText) {
      chunks.push(chunkText);
    }

    if (splitIndex >= text.length) {
      break;
    }

    cursor = Math.max(splitIndex - CHUNK_OVERLAP, cursor + 1);
  }

  return chunks;
}

// Remove extracted table raw text from page text so tables aren't duplicated in text chunks.
function removeTableRegions(pageText: string, pageTables: ExtractedTable[]): string {
  let cleaned = pageText;
  for (const table of pageTables) {
    // Try to remove the raw text of the table from the page
    const idx = cleaned.indexOf(table.rawText);
    if (idx !== -1) {
      cleaned = cleaned.slice(0, idx) + cleaned.slice(idx + table.rawText.length);
    }
  }
  return cleaned;
}

// This helper turns parsed PDF pages into chunk records ready for embedding and storage.
export async function chunkDocument(
  parsedDocument: ParsedDocument,
  tables: ExtractedTable[] = [],
): Promise<DocumentChunkInput[]> {
  console.info("[ingestion] Chunking parsed document", {
    pageCount: parsedDocument.metadata.pageCount,
    tableCount: tables.length,
  });

  const chunks: DocumentChunkInput[] = [];
  let lastSectionTitle: string | null = null;

  // Index tables by page number for quick lookup
  const tablesByPage = new Map<number, ExtractedTable[]>();
  for (const table of tables) {
    const pageTables = tablesByPage.get(table.pageNumber) ?? [];
    pageTables.push(table);
    tablesByPage.set(table.pageNumber, pageTables);
  }

  for (const page of parsedDocument.pages) {
    const pageTables = tablesByPage.get(page.pageNumber) ?? [];

    // Insert table chunks as atomic units first
    for (const table of pageTables) {
      const chunkIndex = chunks.length;
      const title = table.sectionTitle ?? lastSectionTitle;
      if (table.sectionTitle) lastSectionTitle = table.sectionTitle;
      chunks.push({
        chunkIndex,
        chunkType: "table",
        content: table.markdown, // Will be replaced by NL description in table-describer step
        metadata: {
          table_markdown: table.markdown,
          table_data: { headers: table.headers, rows: table.rows },
          preceding_context: table.precedingContext,
        },
        pageNumber: page.pageNumber,
        sectionTitle: title,
      });
    }

    // Remove table regions from page text before splitting into text chunks
    const cleanedText = removeTableRegions(page.text, pageTables);
    const pageChunks = splitTextRecursively(cleanedText);

    pageChunks.forEach((chunkText) => {
      const chunkIndex = chunks.length;
      const chunkPrefix = cleanedText.slice(0, cleanedText.indexOf(chunkText));
      const detected = detectSectionTitle(chunkPrefix);
      if (detected) lastSectionTitle = detected;

      chunks.push({
        chunkIndex,
        chunkType: "text",
        content: chunkText,
        metadata: {},
        pageNumber: page.pageNumber,
        sectionTitle: detected ?? lastSectionTitle,
      });
    });
  }

  console.info("[ingestion] Created document chunks", {
    chunkCount: chunks.length,
    tableChunks: tables.length,
    textChunks: chunks.length - tables.length,
  });

  return chunks;
}
