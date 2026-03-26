# Legal Document Analysis Platform

AI-powered platform for uploading legal documents (insurance policies, leases, contracts) and asking natural language questions about them. Uses RAG with a multi-step LangGraph agent, table-aware PDF processing, and MCP tool integration.

## Current Status (Week 6 complete)

- PDF upload with table detection, NL description generation, and document type classification
- LangGraph agent with query classification, iterative retrieval, table value extraction, and context evaluation
- Streaming chat with citations referencing specific sections and pages
- MCP integration: legal glossary (50+ terms) and web search (Brave API)
- Cross-document comparison with adaptive system prompts per document type
- Conversation management with auto-generated titles
- Dashboard with document selection and batch delete

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in credentials in `.env.local`:
   - `GEMINI_API_KEY` — required for LLM and embeddings
   - `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
   - `LLAMA_PARSE_API_KEY` — optional, enables LlamaParse table extraction
   - `BRAVE_SEARCH_API_KEY` — optional, enables web search tool

4. Start the app:

```bash
npm run dev
```

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # TypeScript check
```

## Architecture

```
User → Next.js Frontend → API Routes (SSE streaming) → LangGraph Agent
                                                            ├── Classify Query
                                                            ├── Retrieve (pgvector)
                                                            ├── Evaluate Context (retry loop)
                                                            ├── Query Table (structured extraction)
                                                            ├── Call Tools (glossary, web search)
                                                            ├── Compare (cross-document)
                                                            └── Synthesize (citations)
```

## Key Directories

- `src/lib/ingestion/` — PDF parsing, table extraction, chunking, embedding pipeline
- `src/lib/agent/` — LangGraph agent (graph, nodes, tools, prompts)
- `src/lib/langchain/` — LLM and embeddings config
- `src/lib/supabase/` — Supabase clients
- `src/app/api/` — API routes (upload, chat, documents, conversations)
- `src/components/` — React components (chat, documents, UI)
- `mcp-servers/` — MCP server packages (glossary, web search)
- `docs/` — Project spec and weekly execution plans

## Teardown

Stop the Next.js dev server with `Ctrl+C`.
