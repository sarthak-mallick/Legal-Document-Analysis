import type { DocumentChunkInput, ParsedDocument } from "@/lib/ingestion/types";

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

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

// This helper turns parsed PDF pages into chunk records ready for embedding and storage.
export async function chunkDocument(
  parsedDocument: ParsedDocument,
): Promise<DocumentChunkInput[]> {
  console.info("[ingestion] Chunking parsed document", {
    pageCount: parsedDocument.metadata.pageCount,
  });

  const chunks: DocumentChunkInput[] = [];

  for (const page of parsedDocument.pages) {
    const pageChunks = splitTextRecursively(page.text);

    pageChunks.forEach((chunkText) => {
      const chunkIndex = chunks.length;
      const chunkPrefix = page.text.slice(0, page.text.indexOf(chunkText));

      chunks.push({
        chunkIndex,
        chunkType: "text",
        content: chunkText,
        metadata: {},
        pageNumber: page.pageNumber,
        sectionTitle: detectSectionTitle(chunkPrefix),
      });
    });
  }

  console.info("[ingestion] Created document chunks", {
    chunkCount: chunks.length,
  });

  return chunks;
}
