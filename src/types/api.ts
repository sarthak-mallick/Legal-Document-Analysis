import type { DocumentChunkRecord, DocumentRecord } from "@/types/document";

export interface DocumentsResponse {
  documents: DocumentRecord[];
}

export interface UploadResponse {
  documentId: string;
  status: string;
  documentType: string;
  chunkCount: number;
  tableCount: number;
}

export interface DocumentDetailResponse {
  document: DocumentRecord;
  chunks: DocumentChunkRecord[];
  chunkCount: number;
  tableCount: number;
}

export interface ErrorResponse {
  error: string;
}
