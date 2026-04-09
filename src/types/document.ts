export type UploadStatus =
  | "processing"
  | "parsing"
  | "extracting_tables"
  | "chunking"
  | "embedding"
  | "ready"
  | "error";

export interface DocumentRecord {
  id: string;
  filename: string;
  file_size: number | null;
  document_type: string | null;
  upload_status: UploadStatus;
  page_count: number | null;
  summary: string | null;
  risk_flags: RiskFlag[];
  gap_analysis: GapItem[];
  created_at: string;
  updated_at: string;
}

export interface RiskFlag {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  section: string | null;
}

export interface GapItem {
  category: string;
  status: "covered" | "not_covered" | "partial";
  details: string | null;
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
