# Week 4 Execution

## Objective

Replace the simple RAG chain from Week 3 with a multi-step LangGraph agent that classifies queries, performs iterative retrieval, extracts table values, and produces better answers.

## In Scope

- W4-001 Define agent state with LangGraph Annotation
- W4-002 Classify Query node (6 query types)
- W4-003 Retrieve node with sub-query expansion
- W4-004 Evaluate Context node with retry loop
- W4-005 Table Query node for structured value extraction
- W4-006 Synthesize node with citation extraction
- W4-007 Build and compile LangGraph state graph
- W4-008 Replace chat API with agent invocation
- W4-009 Agent execution trace logging

## Out of Scope

- Week 5 MCP tool integration (glossary, web search)
- Week 6 multi-document comparison
- True streaming from agent (current: agent runs to completion, then streams result)
- Agent debug view UI (trace data is sent via SSE but not displayed yet)

## Live Task Status

| Task ID | Status | Note |
| --- | --- | --- |
| W4-001 | Complete | `AgentState` with Annotation reducers for chunk dedup, node tracking, retrieval attempts, table data, and context sufficiency. |
| W4-002 | Complete | `classifyQuery` sends query to Gemini for classification into simple_factual, table_lookup, term_explanation, multi_section, cross_document, or general. |
| W4-003 | Complete | `retrieve` performs vector search; for multi_section/cross_document queries, generates 2-3 sub-queries and merges results with deduplication. |
| W4-004 | Complete | `evaluateContext` asks Gemini to assess sufficiency; returns refined query if insufficient; caps at 3 attempts then proceeds. |
| W4-005 | Complete | `queryTable` extracts specific values from structured table data in chunk metadata using Gemini. |
| W4-006 | Complete | `synthesize` builds full prompt with all context (chunks + table data + history), generates response, extracts citations. |
| W4-007 | Complete | Graph: START → classifyQuery → retrieve → evaluateContext → (retrieve \| queryTable \| synthesize) → END. Conditional edges based on state. |
| W4-008 | Complete | Chat API now invokes compiled LangGraph agent instead of direct LLM chain. Response streamed via SSE in chunks. |
| W4-009 | Complete | Agent trace (nodesVisited, queryType, retrievalAttempts, chunkCount, hasTableData) stored in messages.tool_calls and sent as agent_debug SSE event. |

## Session Log (Append-Only)

- 2026-03-26: Implemented all Week 4 tasks (W4-001 through W4-009). Build and typecheck pass.

## Handoff Snapshot

```text
Scope: Week 4, W4-001 to W4-009
Changes: Added @langchain/langgraph dep, agent state definition, 5 processing nodes (classify, retrieve, evaluate, queryTable, synthesize), compiled graph with conditional routing, replaced chat API chain with agent invocation
Acceptance criteria status: Partial - all code compiles and builds; agent flow depends on live Gemini API for all LLM calls across nodes; true streaming not yet implemented (agent runs to completion, then result is chunked to SSE)
Risks/issues: Agent makes multiple LLM calls per request (classify + evaluate + synthesize minimum), which increases latency and API costs; true streaming would require LangGraph streaming support
Next step: Week 5 (MCP integration) or test agent end-to-end with real documents to verify query classification and iterative retrieval
```
