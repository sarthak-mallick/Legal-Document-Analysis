import { getFloatEnv, getNumberEnv } from "@/lib/env";
import { getLLM } from "@/lib/langchain/model";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";

const MAX_RETRIEVAL_ATTEMPTS = getNumberEnv("MAX_RETRIEVAL_ATTEMPTS", 3);
const EVAL_CHUNK_SAMPLE = getNumberEnv("EVAL_CHUNK_SAMPLE", 8);
const EVAL_SNIPPET_LENGTH = getNumberEnv("EVAL_SNIPPET_LENGTH", 200);
const HIGH_CONFIDENCE_THRESHOLD = getFloatEnv("HIGH_CONFIDENCE_THRESHOLD", 0.8);
const HIGH_CONFIDENCE_MIN_CHUNKS = getNumberEnv("HIGH_CONFIDENCE_MIN_CHUNKS", 2);

interface EvaluationResult {
  sufficient: boolean;
  missing: string;
  refinedQuery?: string;
}

// Evaluate whether retrieved context is sufficient to answer the query.
export async function evaluateContext(state: AgentStateType): Promise<AgentUpdateType> {
  console.info("[agent:evaluate] Evaluating context sufficiency", {
    chunkCount: state.retrievedChunks.length,
    attempt: state.retrievalAttempts,
  });

  // If no chunks retrieved at all, mark insufficient
  if (state.retrievedChunks.length === 0) {
    if (state.retrievalAttempts >= MAX_RETRIEVAL_ATTEMPTS) {
      return {
        contextSufficient: true,
        nodesVisited: ["evaluateContext"],
      };
    }
    return {
      contextSufficient: false,
      refinedQuery: state.query,
      nodesVisited: ["evaluateContext"],
    };
  }

  // Fast-path: skip LLM evaluation when retrieval confidence is very high
  const highConfChunks = state.retrievedChunks.filter(
    (c) => c.similarity >= HIGH_CONFIDENCE_THRESHOLD,
  );
  if (highConfChunks.length >= HIGH_CONFIDENCE_MIN_CHUNKS) {
    console.info("[agent:evaluate] High-confidence retrieval, skipping LLM evaluation", {
      highConfCount: highConfChunks.length,
    });
    return {
      contextSufficient: true,
      nodesVisited: ["evaluateContext"],
    };
  }

  const llm = getLLM();

  try {
    const chunkSummary = state.retrievedChunks
      .slice(0, EVAL_CHUNK_SAMPLE)
      .map(
        (c, i) =>
          `[${i + 1}] (${c.section_title ?? "unknown"}, p${c.page_number ?? "?"}): ${c.content.slice(0, EVAL_SNIPPET_LENGTH)}`,
      )
      .join("\n");

    const response = await llm.invoke([
      {
        role: "system",
        content: `You evaluate whether retrieved document context is sufficient to answer a question. Respond with ONLY valid JSON (no markdown fences):
{"sufficient": true/false, "missing": "description of what's missing", "refinedQuery": "a better search query if not sufficient"}`,
      },
      {
        role: "user",
        content: `Question: ${state.query}\n\nRetrieved context:\n${chunkSummary}`,
      },
    ]);

    const content =
      typeof response.content === "string"
        ? response.content.trim()
        : String(response.content).trim();

    // Extract the first JSON object, ignoring markdown fences or preamble text.
    const objMatch = content.match(/\{[\s\S]*\}/);
    if (!objMatch) throw new Error("No JSON object found in evaluation response");
    const evaluation = JSON.parse(objMatch[0]) as EvaluationResult;

    // If max attempts reached, proceed regardless
    if (!evaluation.sufficient && state.retrievalAttempts >= MAX_RETRIEVAL_ATTEMPTS) {
      console.info("[agent:evaluate] Max attempts reached, proceeding with available context");
      return {
        contextSufficient: true,
        nodesVisited: ["evaluateContext"],
      };
    }

    console.info("[agent:evaluate] Evaluation result", {
      sufficient: evaluation.sufficient,
      missing: evaluation.missing?.slice(0, 100),
    });

    return {
      contextSufficient: evaluation.sufficient,
      refinedQuery: evaluation.sufficient ? null : (evaluation.refinedQuery ?? null),
      nodesVisited: ["evaluateContext"],
    };
  } catch (error) {
    console.error("[agent:evaluate] Evaluation failed, proceeding", error);
    return {
      contextSufficient: true,
      nodesVisited: ["evaluateContext"],
    };
  }
}
