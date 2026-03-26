import { END, START, StateGraph } from "@langchain/langgraph";

import { AgentState, type AgentStateType } from "@/lib/agent/state";
import { classifyQuery } from "@/lib/agent/nodes/classify-query";
import { retrieve } from "@/lib/agent/nodes/retrieve";
import { evaluateContext } from "@/lib/agent/nodes/evaluate-context";
import { queryTable } from "@/lib/agent/nodes/query-table";
import { synthesize } from "@/lib/agent/nodes/synthesize";

/*
  Agent graph:

  START → classifyQuery → retrieve → evaluateContext
    evaluateContext → retrieve       (if not sufficient and attempts < 3)
    evaluateContext → queryTable     (if sufficient and table chunks present)
    evaluateContext → synthesize     (if sufficient and no tables)
  queryTable → synthesize → END
*/

// Route after evaluateContext based on sufficiency and table presence.
function afterEvaluate(state: AgentStateType): "retrieve" | "queryTable" | "synthesize" {
  if (!state.contextSufficient) {
    return "retrieve";
  }

  const hasTableChunks = state.retrievedChunks.some((c) => c.chunk_type === "table");
  if (hasTableChunks && (state.queryType === "table_lookup" || state.queryType === "simple_factual")) {
    return "queryTable";
  }

  return "synthesize";
}

// Build and compile the LangGraph agent.
export function buildAgentGraph() {
  const graph = new StateGraph(AgentState)
    .addNode("classifyQuery", classifyQuery)
    .addNode("retrieve", retrieve)
    .addNode("evaluateContext", evaluateContext)
    .addNode("queryTable", queryTable)
    .addNode("synthesize", synthesize)
    .addEdge(START, "classifyQuery")
    .addEdge("classifyQuery", "retrieve")
    .addEdge("retrieve", "evaluateContext")
    .addConditionalEdges("evaluateContext", afterEvaluate, [
      "retrieve",
      "queryTable",
      "synthesize",
    ])
    .addEdge("queryTable", "synthesize")
    .addEdge("synthesize", END);

  return graph.compile();
}
