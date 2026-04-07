import { Annotation } from "@langchain/langgraph";

import type { Citation, MessageRecord, RetrievedChunk } from "@/types/conversation";
import type { ToolResult } from "@/lib/agent/tools/mcp-tools";

export type QueryType =
  | "simple_factual"
  | "table_lookup"
  | "term_explanation"
  | "multi_section"
  | "cross_document"
  | "general";

export interface TableQueryResult {
  question: string;
  answer: string;
  sourceChunkId: string;
}

export interface DocumentMeta {
  id: string;
  filename: string;
  documentType: string | null;
}

// LangGraph agent state shared across all nodes.
export const AgentState = Annotation.Root({
  query: Annotation<string>(),
  queryType: Annotation<QueryType>(),
  documentIds: Annotation<string[]>(),
  documentMetas: Annotation<DocumentMeta[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  conversationHistory: Annotation<MessageRecord[]>(),
  retrievedChunks: Annotation<RetrievedChunk[]>({
    reducer: (prev, next) => {
      // Deduplicate by chunk id when merging retrieval rounds
      const seen = new Set(prev.map((c) => c.id));
      const merged = [...prev];
      for (const chunk of next) {
        if (!seen.has(chunk.id)) {
          merged.push(chunk);
          seen.add(chunk.id);
        }
      }
      return merged;
    },
    default: () => [],
  }),
  retrievalAttempts: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  refinedQuery: Annotation<string | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  tableData: Annotation<TableQueryResult | null>({
    reducer: (_prev, next) => next,
    default: () => null,
  }),
  toolResults: Annotation<ToolResult[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  toolsCalled: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  contextSufficient: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  response: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  citations: Annotation<Citation[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  // Token usage from LLM calls
  tokenUsage: Annotation<{ promptTokens: number; completionTokens: number }>({
    reducer: (prev, next) => ({
      promptTokens: prev.promptTokens + next.promptTokens,
      completionTokens: prev.completionTokens + next.completionTokens,
    }),
    default: () => ({ promptTokens: 0, completionTokens: 0 }),
  }),
  // Track which nodes were visited for debug logging
  nodesVisited: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;
export type AgentUpdateType = typeof AgentState.Update;
