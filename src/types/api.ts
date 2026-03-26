import type { ConversationRecord, MessageRecord } from "@/types/conversation";
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

export interface ConversationsResponse {
  conversations: ConversationRecord[];
}

export interface ConversationDetailResponse {
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

export interface ErrorResponse {
  error: string;
}

// SSE event types from the chat streaming endpoint.
export type ChatStreamEvent =
  | { type: "meta"; conversationId: string }
  | { type: "token"; content: string }
  | { type: "citations"; citations: MessageRecord["citations"] }
  | { type: "agent_debug"; nodesVisited: string[]; queryType: string; retrievalAttempts: number; chunkCount: number }
  | { type: "error"; content: string };
