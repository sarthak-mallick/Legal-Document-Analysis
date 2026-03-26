import { END, START, StateGraph } from "@langchain/langgraph";

import { AgentState, type AgentStateType } from "@/lib/agent/state";
import { classifyQuery } from "@/lib/agent/nodes/classify-query";
import { retrieve } from "@/lib/agent/nodes/retrieve";
import { evaluateContext } from "@/lib/agent/nodes/evaluate-context";
import { queryTable } from "@/lib/agent/nodes/query-table";
import { synthesize } from "@/lib/agent/nodes/synthesize";
import { callTools } from "@/lib/agent/nodes/call-tools";

/*
  Agent graph:

  START → classifyQuery
  classifyQuery → callTools       (if term_explanation or needs external context)
  classifyQuery → retrieve        (for document-focused queries)
  callTools → retrieve
  retrieve → evaluateContext
  evaluateContext → retrieve       (if not sufficient, attempts < 3)
  evaluateContext → callTools      (if not sufficient and tools not yet called)
  evaluateContext → queryTable     (if sufficient + table chunks)
  evaluateContext → synthesize     (if sufficient)
  queryTable → synthesize → END
*/

// Route after classifyQuery: term explanations go to tools first, others to retrieve.
function afterClassify(state: AgentStateType): "callTools" | "retrieve" {
  if (state.queryType === "term_explanation") {
    return "callTools";
  }
  return "retrieve";
}

// Route after evaluateContext based on sufficiency, tools, and table presence.
function afterEvaluate(
  state: AgentStateType,
): "retrieve" | "callTools" | "queryTable" | "synthesize" {
  if (!state.contextSufficient) {
    // If tools haven't been called yet and might help, try tools before retrying retrieval
    if (!state.toolsCalled && state.queryType === "multi_section") {
      return "callTools";
    }
    return "retrieve";
  }

  const hasTableChunks = state.retrievedChunks.some((c) => c.chunk_type === "table");
  if (
    hasTableChunks &&
    (state.queryType === "table_lookup" || state.queryType === "simple_factual")
  ) {
    return "queryTable";
  }

  return "synthesize";
}

// Build and compile the LangGraph agent.
export function buildAgentGraph() {
  const graph = new StateGraph(AgentState)
    .addNode("classifyQuery", classifyQuery)
    .addNode("callTools", callTools)
    .addNode("retrieve", retrieve)
    .addNode("evaluateContext", evaluateContext)
    .addNode("queryTable", queryTable)
    .addNode("synthesize", synthesize)
    .addEdge(START, "classifyQuery")
    .addConditionalEdges("classifyQuery", afterClassify, [
      "callTools",
      "retrieve",
    ])
    .addEdge("callTools", "retrieve")
    .addEdge("retrieve", "evaluateContext")
    .addConditionalEdges("evaluateContext", afterEvaluate, [
      "retrieve",
      "callTools",
      "queryTable",
      "synthesize",
    ])
    .addEdge("queryTable", "synthesize")
    .addEdge("synthesize", END);

  return graph.compile();
}
