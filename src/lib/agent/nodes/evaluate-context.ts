import { getFloatEnv, getNumberEnv } from "@/lib/env";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";

const MAX_RETRIEVAL_ATTEMPTS = getNumberEnv("MAX_RETRIEVAL_ATTEMPTS", 3);
const HIGH_CONFIDENCE_THRESHOLD = getFloatEnv("HIGH_CONFIDENCE_THRESHOLD", 0.8);
const HIGH_CONFIDENCE_MIN_CHUNKS = getNumberEnv("HIGH_CONFIDENCE_MIN_CHUNKS", 2);
const SUFFICIENT_THRESHOLD = getFloatEnv("SUFFICIENT_THRESHOLD", 0.4);
const SUFFICIENT_MIN_CHUNKS = getNumberEnv("SUFFICIENT_MIN_CHUNKS", 1);

// Strip question words and filler to build a simpler retry query.
function simplifyQuery(query: string): string {
  return query
    .replace(
      /\b(what|which|how|does|is|are|can|do|the|a|an|my|our|this|in|of|for|to|from|about|please|tell\s+me)\b/gi,
      "",
    )
    .replace(/[?.,!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Evaluate whether retrieved context is sufficient using heuristic scoring (no LLM call).
export function evaluateContext(state: AgentStateType): AgentUpdateType {
  console.info("[agent:evaluate] Evaluating context (heuristic)", {
    chunkCount: state.retrievedChunks.length,
    attempt: state.retrievalAttempts,
  });

  // No chunks at all — retry if attempts remain
  if (state.retrievedChunks.length === 0) {
    if (state.retrievalAttempts >= MAX_RETRIEVAL_ATTEMPTS) {
      return { contextSufficient: true, nodesVisited: ["evaluateContext"] };
    }
    const simplified = simplifyQuery(state.query);
    return {
      contextSufficient: false,
      refinedQuery: simplified || state.query,
      nodesVisited: ["evaluateContext"],
    };
  }

  // High confidence fast-path: 2+ chunks with very high similarity
  const highConfChunks = state.retrievedChunks.filter(
    (c) => c.similarity >= HIGH_CONFIDENCE_THRESHOLD,
  );
  if (highConfChunks.length >= HIGH_CONFIDENCE_MIN_CHUNKS) {
    console.info("[agent:evaluate] High-confidence retrieval", {
      highConfCount: highConfChunks.length,
    });
    return { contextSufficient: true, nodesVisited: ["evaluateContext"] };
  }

  // Medium confidence: at least some chunks above the base similarity threshold
  const aboveThreshold = state.retrievedChunks.filter((c) => c.similarity >= SUFFICIENT_THRESHOLD);
  if (aboveThreshold.length >= SUFFICIENT_MIN_CHUNKS) {
    console.info("[agent:evaluate] Sufficient context above threshold", {
      count: aboveThreshold.length,
    });
    return { contextSufficient: true, nodesVisited: ["evaluateContext"] };
  }

  // Low confidence — retry if attempts remain
  if (state.retrievalAttempts >= MAX_RETRIEVAL_ATTEMPTS) {
    console.info("[agent:evaluate] Max attempts reached, proceeding with available context");
    return { contextSufficient: true, nodesVisited: ["evaluateContext"] };
  }

  const simplified = simplifyQuery(state.query);
  console.info("[agent:evaluate] Context insufficient, retrying", { simplified });

  return {
    contextSufficient: false,
    refinedQuery: simplified || state.query,
    nodesVisited: ["evaluateContext"],
  };
}
