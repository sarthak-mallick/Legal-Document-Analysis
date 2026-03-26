import { getLLM } from "@/lib/langchain/model";
import type { AgentStateType, AgentUpdateType, QueryType } from "@/lib/agent/state";

const VALID_TYPES: QueryType[] = [
  "simple_factual",
  "table_lookup",
  "term_explanation",
  "multi_section",
  "cross_document",
  "general",
];

const CLASSIFICATION_PROMPT = `Classify this user question about legal document(s) into one of these categories:

- simple_factual: Direct factual question answerable from a single section (e.g., "What is my deductible?")
- table_lookup: Question about values likely in a table (e.g., "What are my coverage limits?")
- term_explanation: Question about a legal term or concept (e.g., "What does subrogation mean?")
- multi_section: Question requiring information from multiple document sections (e.g., "Am I covered for rental car accidents?")
- cross_document: Question comparing or spanning multiple documents, or asking "which document/policy" questions (e.g., "Which policy covers water damage?", "Compare my policies", "Difference between my lease and insurance")
- general: Greetings, off-topic, or clarification requests

Respond with ONLY the category name, nothing else.`;

// Classify the user's query to determine the retrieval strategy.
export async function classifyQuery(state: AgentStateType): Promise<AgentUpdateType> {
  console.info("[agent:classify] Classifying query", { query: state.query.slice(0, 80) });

  const llm = getLLM();

  try {
    const response = await llm.invoke([
      { role: "system", content: CLASSIFICATION_PROMPT },
      { role: "user", content: state.query },
    ]);

    const raw = typeof response.content === "string"
      ? response.content.trim().toLowerCase()
      : String(response.content).trim().toLowerCase();

    const queryType: QueryType = VALID_TYPES.includes(raw as QueryType)
      ? (raw as QueryType)
      : "simple_factual";

    console.info("[agent:classify] Query classified", { queryType });

    return {
      queryType,
      nodesVisited: ["classifyQuery"],
    };
  } catch (error) {
    console.error("[agent:classify] Classification failed, defaulting to simple_factual", error);
    return {
      queryType: "simple_factual" as QueryType,
      nodesVisited: ["classifyQuery"],
    };
  }
}
