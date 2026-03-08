import type { DocumentRecord } from "@/types/document";

export interface DocumentsResponse {
  documents: DocumentRecord[];
}

export interface UploadResponse {
  documentId: string;
  status: string;
}

export interface ErrorResponse {
  error: string;
}

