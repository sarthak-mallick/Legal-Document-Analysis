import { getLLM } from "@/lib/langchain/model";
import { retrieveChunks } from "@/lib/agent/tools/retriever-tool";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";

// Generate sub-queries for multi-section questions to improve recall.
async function generateSubQueries(query: string): Promise<string[]> {
  const llm = getLLM();
  try {
    const response = await llm.invoke([
      {
        role: "system",
        content:
          "Break this question into 2-3 specific sub-queries to search a legal document. Output one sub-query per line, nothing else.",
      },
      { role: "user", content: query },
    ]);

    const content =
      typeof response.content === "string" ? response.content : String(response.content);

    return content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return [query];
  }
}

// Perform vector search retrieval, with sub-query expansion for complex questions.
export async function retrieve(state: AgentStateType): Promise<AgentUpdateType> {
  const searchQuery = state.refinedQuery ?? state.query;
  const attempt = state.retrievalAttempts + 1;

  console.info("[agent:retrieve] Retrieval attempt", { attempt, query: searchQuery.slice(0, 80) });

  let allChunks = await retrieveChunks(searchQuery, state.documentIds);

  // For multi-section queries, also search with sub-queries
  if (state.queryType === "multi_section" || state.queryType === "cross_document") {
    const subQueries = await generateSubQueries(searchQuery);
    for (const sub of subQueries) {
      if (sub !== searchQuery) {
        const subChunks = await retrieveChunks(sub, state.documentIds);
        allChunks = [...allChunks, ...subChunks];
      }
    }
  }

  // Filter out low-similarity chunks and deduplicate by chunk id
  const SIMILARITY_THRESHOLD = 0.7;
  const seen = new Set<string>();
  const deduplicated = allChunks.filter((c) => {
    if (c.similarity < SIMILARITY_THRESHOLD) return false;
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  console.info("[agent:retrieve] Retrieved chunks", {
    count: deduplicated.length,
    attempt,
  });

  return {
    retrievedChunks: deduplicated,
    retrievalAttempts: attempt,
    refinedQuery: null,
    nodesVisited: ["retrieve"],
  };
}
