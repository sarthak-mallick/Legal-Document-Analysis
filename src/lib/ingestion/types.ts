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
  chunkType: "text";
  content: string;
  metadata: Record<string, unknown>;
  pageNumber: number;
  sectionTitle: string | null;
}

