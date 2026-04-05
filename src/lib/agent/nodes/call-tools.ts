import { lookupTerm, searchWeb, type ToolResult } from "@/lib/agent/tools/mcp-tools";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";

// Call external tools (glossary, web search) based on query type and context.
export async function callTools(state: AgentStateType): Promise<AgentUpdateType> {
  console.info("[agent:callTools] Invoking tools", { queryType: state.queryType });

  const results: ToolResult[] = [];

  // For term explanations, always try the glossary
  if (state.queryType === "term_explanation") {
    // Extract the term from the query
    const termMatch = state.query.match(
      /(?:what (?:does|is)|define|explain|meaning of)\s+[""']?(.+?)[""']?\s*(?:mean|in|clause|$)/i,
    );
    const term = termMatch?.[1]?.trim() ?? state.query;
    const glossaryResult = lookupTerm(term);
    results.push(glossaryResult);
  }

  // For questions that might benefit from external context, try web search
  if (state.queryType === "term_explanation" || state.queryType === "multi_section") {
    // Only search web if BRAVE_SEARCH_API_KEY is available
    if (process.env.BRAVE_SEARCH_API_KEY) {
      const searchResult = await searchWeb(`${state.query} legal insurance`, 3);
      results.push(searchResult);
    }
  }

  console.info("[agent:callTools] Tool results", {
    toolCount: results.length,
    tools: results.map((r) => r.tool),
  });

  return {
    toolResults: results,
    toolsCalled: true,
    nodesVisited: ["callTools"],
  };
}
