export interface ConversationRecord {
  id: string;
  user_id: string;
  title: string | null;
  document_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  tool_calls: Record<string, unknown>[];
  created_at: string;
}

export interface Citation {
  chunk_id: string;
  section_title: string | null;
  page_number: number | null;
  snippet: string;
}

export interface RetrievedChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_type: string;
  section_title: string | null;
  page_number: number | null;
  metadata: Record<string, unknown>;
  similarity: number;
}
