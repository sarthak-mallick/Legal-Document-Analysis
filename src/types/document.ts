export type UploadStatus = "processing" | "ready" | "error";

export interface DocumentRecord {
  id: string;
  filename: string;
  file_size: number | null;
  document_type: string | null;
  upload_status: UploadStatus;
  page_count: number | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunkRecord {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  chunk_type: "text" | "table" | "heading" | "list";
  section_title: string | null;
  page_number: number | null;
  metadata: Record<string, unknown>;
}
