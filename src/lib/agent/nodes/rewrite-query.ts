import { getLLM } from "@/lib/langchain/model";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";

// Rewrite ambiguous follow-up queries using conversation history.
// Only calls the LLM when history exists; first messages pass through unchanged.
export async function rewriteQuery(state: AgentStateType): Promise<AgentUpdateType> {
  if (!state.conversationHistory || state.conversationHistory.length === 0) {
    console.info("[agent:rewrite] No history, skipping rewrite");
    return { nodesVisited: ["rewriteQuery"] };
  }

  console.info("[agent:rewrite] Rewriting query with conversation context");

  const llm = getLLM();

  // Use last 4 messages to keep the prompt short
  const recentHistory = state.conversationHistory.slice(-4);
  const historyText = recentHistory
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content.slice(0, 200)}`)
    .join("\n");

  try {
    const response = await llm.invoke([
      {
        role: "system",
        content:
          "Rewrite the user's latest question so it is self-contained — resolve pronouns, references to previous answers, and implicit context. Output ONLY the rewritten question, nothing else. If the question is already self-contained, return it unchanged.",
      },
      {
        role: "user",
        content: `Conversation so far:\n${historyText}\n\nLatest question: ${state.query}`,
      },
    ]);

    const rewritten =
      typeof response.content === "string"
        ? response.content.trim()
        : String(response.content).trim();

    if (rewritten && rewritten.toLowerCase() !== state.query.toLowerCase()) {
      console.info("[agent:rewrite] Query rewritten", {
        original: state.query.slice(0, 80),
        rewritten: rewritten.slice(0, 80),
      });
      return {
        rewrittenQuery: rewritten,
        nodesVisited: ["rewriteQuery"],
      };
    }

    return { nodesVisited: ["rewriteQuery"] };
  } catch (error) {
    console.error("[agent:rewrite] Rewrite failed, using original query", error);
    return { nodesVisited: ["rewriteQuery"] };
  }
}
