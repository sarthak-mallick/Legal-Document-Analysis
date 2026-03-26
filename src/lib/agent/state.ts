import { Annotation } from "@langchain/langgraph";

import type { Citation, MessageRecord, RetrievedChunk } from "@/types/conversation";

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

// LangGraph agent state shared across all nodes.
export const AgentState = Annotation.Root({
  query: Annotation<string>(),
  queryType: Annotation<QueryType>(),
  documentIds: Annotation<string[]>(),
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
  // Track which nodes were visited for debug logging
  nodesVisited: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentState.State;
export type AgentUpdateType = typeof AgentState.Update;
