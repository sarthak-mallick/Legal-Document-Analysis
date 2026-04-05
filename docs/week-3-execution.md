# Week 3 Execution

## Objective

Add basic RAG chat so users can ask questions about uploaded documents and get streaming answers with citations referencing specific sections and pages.

## In Scope

- W3-001 Vector search retriever tool
- W3-002 Streaming chat API with RAG
- W3-003 Citation tracking and extraction
- W3-004 Chat UI (streaming messages, citation cards, input)
- W3-005 Conversation management (create, list, load, delete, auto-title)
- W3-006 Prompt engineering (system prompt, synthesis prompt)
- W3-007 Chat pages and navigation

## Out of Scope

- Week 4 LangGraph agent with multi-step reasoning
- Week 5 MCP tool integration
- Conversation search or filtering
- Multi-document comparison queries (Week 6)

## Live Task Status

| Task ID | Status   | Note                                                                                                                                                           |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W3-001  | Complete | Retriever wraps `match_chunks` pgvector RPC with similarity threshold filtering (0.7).                                                                         |
| W3-002  | Complete | POST `/api/chat` performs RAG retrieval, builds synthesis prompt, streams Gemini response via SSE. Saves user and assistant messages with citations.           |
| W3-003  | Complete | Parses `[Section: X, Page: Y]` patterns from response text, maps to retrieved chunks, stores in messages.citations jsonb.                                      |
| W3-004  | Complete | ChatWindow with SSE streaming, MessageBubble with expandable CitationCards, auto-resizing ChatInput with Enter shortcut.                                       |
| W3-005  | Complete | GET/DELETE `/api/conversations/[id]`, GET `/api/conversations`. Auto-generates 5-word title via Gemini. ConversationSidebar with delete.                       |
| W3-006  | Complete | System prompt defines legal analyst persona with citation rules. Synthesis prompt formats retrieved context with section/page labels and conversation history. |
| W3-007  | Complete | `/chat` and `/chat/[conversationId]` pages with document selector sidebar, conversation list, and dashboard Open Chat link.                                    |

## Session Log (Append-Only)

- 2026-03-26: Implemented all Week 3 tasks (W3-001 through W3-007). Build and typecheck pass.

## Handoff Snapshot

```text
Scope: Week 3, W3-001 to W3-007
Changes: Added retriever tool, system/synthesis prompts, streaming chat API with SSE, conversations CRUD API, chat UI components (ChatWindow, MessageBubble, CitationCard, StreamingMessage, ChatInput, DocumentSelector, ConversationSidebar), chat pages with sidebar layout
Acceptance criteria status: Partial - all code compiles and builds; chat flow depends on live Supabase (conversations/messages tables) and Gemini API credentials; citation extraction depends on Gemini following the citation format in the prompt
Risks/issues: Citation parsing is regex-based and depends on the LLM consistently using [Section: X, Page: Y] format; typed routes require cast workarounds until build generates route types
Next step: Test end-to-end with a real uploaded document and Gemini credentials to verify streaming, citation accuracy, and conversation persistence
```
