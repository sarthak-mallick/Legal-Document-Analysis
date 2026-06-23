import type { RetrievedChunk } from "@/types/conversation";
import type { QueryType } from "@/lib/agent/state";

// One synthesized golden question. The source chunk is the ground-truth relevant
// chunk (used for retrieval recall) and the reference answer is an LLM draft you
// can hand-curate later.
export interface EvalQuestion {
  id: string;
  question: string;
  referenceAnswer: string;
  sourceChunkId: string;
  sourceDocumentId: string;
  documentIds: string[];
}

// Per-question, per-system measurements.
export interface SystemRunResult {
  answer: string;
  retrievedChunkIds: string[];
  // Retrieval metrics against the source chunk
  hit: boolean; // was the source chunk retrieved at all
  reciprocalRank: number; // 1/rank of source chunk, else 0
  // LLM-as-judge metrics, normalized to 0..1
  faithfulness: number;
  answerRelevancy: number;
  contextRelevancy: number;
  completeness: number;
  correctness: number;
}

export interface QuestionResult {
  question: EvalQuestion;
  agentQueryType: QueryType | null;
  agent: SystemRunResult;
  baseline: SystemRunResult;
}

export interface JudgeScores {
  faithfulness: number;
  answerRelevancy: number;
  contextRelevancy: number;
  completeness: number;
  correctness: number;
}

export type { RetrievedChunk };
