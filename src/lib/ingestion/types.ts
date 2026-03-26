export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  metadata: {
    pageCount: number;
    title?: string;
  };
  pages: ParsedPage[];
}

export interface DocumentChunkInput {
  chunkIndex: number;
  chunkType: "text" | "table" | "heading" | "list";
  content: string;
  metadata: Record<string, unknown>;
  pageNumber: number;
  sectionTitle: string | null;
}

export interface ExtractedTable {
  markdown: string;
  headers: string[];
  rows: string[][];
  rawText: string;
  pageNumber: number;
  precedingContext: string;
  sectionTitle: string | null;
}

