# Week 5 Execution

## Objective

Build and connect custom MCP servers (glossary, web search) that give the LangGraph agent access to external knowledge for term explanations and contextual information.

## In Scope

- W5-001 MCP Glossary Server (50+ legal/insurance terms, fuzzy matching)
- W5-002 MCP Web Search Server (Brave Search API integration)
- W5-003 In-app MCP tool wrappers (Option A: direct function calls)
- W5-004 Call-tools agent node
- W5-005 Agent state extension (toolResults, toolsCalled)
- W5-006 Graph routing update (callTools integration)
- W5-007 Synthesis prompt update (tool results, source distinction)

## Out of Scope

- Week 6 multi-document comparison
- MCP client-based integration (using Option A instead for simplicity)
- Dedicated deployment of MCP servers (logic inlined in Next.js)
- Agent debug UI for tool call visualization

## Live Task Status

| Task ID | Status   | Note                                                                                                                                                                                                   |
| ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| W5-001  | Complete | Glossary server with 50+ terms across general, liability, property, auto, employment categories. lookup_term with fuzzy matching (Levenshtein ≤ 2), list_terms_by_category. MCP SDK + stdio transport. |
| W5-002  | Complete | Web search server with search_web (Brave Search API) and fetch_page_content (HTML-to-text extraction). Rate-limited, error-handled.                                                                    |
| W5-003  | Complete | In-app wrappers mirror MCP server logic: glossary lookup reads JSON directly, web search calls Brave API. No MCP client dependency needed.                                                             |
| W5-004  | Complete | callTools node: term_explanation queries get glossary lookup + optional web search; multi_section queries get web search when BRAVE_SEARCH_API_KEY is set.                                             |
| W5-005  | Complete | AgentState extended with `toolResults: ToolResult[]` (append reducer) and `toolsCalled: boolean`.                                                                                                      |
| W5-006  | Complete | Graph: classifyQuery → callTools for term_explanation; evaluateContext → callTools if insufficient and tools not yet called.                                                                           |
| W5-007  | Complete | Synthesis prompt includes tool results section and instruction to distinguish document-sourced vs externally-sourced information.                                                                      |

## New Env Vars

- `BRAVE_SEARCH_API_KEY` (optional) — enables web search; glossary works without any API key

## Session Log (Append-Only)

- 2026-03-26: Implemented all Week 5 tasks (W5-001 through W5-007). Build and typecheck pass.

## Handoff Snapshot

```text
Scope: Week 5, W5-001 to W5-007
Changes: Added glossary-server and web-search-server MCP packages, in-app tool wrappers, call-tools agent node, updated graph routing and synthesis prompt
Acceptance criteria status: Partial - glossary works fully offline; web search requires BRAVE_SEARCH_API_KEY; MCP servers are standalone packages with their own build but the agent uses in-app wrappers (Option A)
Risks/issues: MCP servers need separate npm install and build to run standalone; web search quality depends on Brave API; glossary coverage is limited to ~50 terms
Next step: Week 6 (multi-document support) or expand glossary and test with real term explanation queries
```
