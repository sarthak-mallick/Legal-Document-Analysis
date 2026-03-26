# Legal Document Analysis Platform

AI-powered platform for uploading legal documents (insurance policies, leases, contracts, NDAs) and asking natural language questions about them. Uses RAG with a multi-step LangGraph agent, table-aware PDF processing, MCP tool integration, and cross-document comparison.

## Features

- **Table-Aware Ingestion** — Detects tables via LlamaParse or Gemini fallback, generates NL descriptions, preserves structured data
- **Multi-Step Agent** — LangGraph agent classifies queries, iterates on retrieval, extracts table values, calls external tools
- **Streaming Chat** — SSE-based streaming with token-by-token display and expandable citation cards
- **MCP Tools** — Legal glossary (50+ terms with fuzzy matching), optional Brave web search
- **Cross-Document Comparison** — Compare multiple documents with per-document attribution
- **Risk & Gap Analysis** — Auto-generated summaries, severity-rated risk flags, coverage matrix per document type
- **Adaptive Prompts** — System prompts tuned for insurance, lease, employment, NDA, and ToS documents
- **Dark Mode** — Toggle between light and dark themes

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy and fill in environment variables:

```bash
cp .env.example .env.local
```

Required variables:
- `GEMINI_API_KEY` — Google Gemini API key
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key

Optional:
- `LLAMA_PARSE_API_KEY` — Enables LlamaParse table extraction
- `BRAVE_SEARCH_API_KEY` — Enables web search tool in the agent

3. Set up Supabase with pgvector extension and run the migration in `supabase/migrations/`.

4. Start the app:

```bash
npm run dev
```

## Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Production build
npm run typecheck  # TypeScript check (tsc --noEmit)
```

## Architecture

```
User → Next.js Frontend → API Routes (SSE streaming) → LangGraph Agent
                                                            ├── Classify Query (6 types)
                                                            ├── Retrieve (pgvector + sub-queries)
                                                            ├── Evaluate Context (retry loop, max 3)
                                                            ├── Query Table (structured extraction)
                                                            ├── Call Tools (glossary, web search)
                                                            ├── Compare (cross-document)
                                                            └── Synthesize (citations + source attribution)
```

### Ingestion Pipeline

```
PDF Upload → Parse → Extract Tables → Chunk (table-aware) → Generate Table Descriptions → Detect Document Type → Embed → Store
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/lib/ingestion/` | PDF parsing, table extraction, chunking, embedding pipeline |
| `src/lib/agent/` | LangGraph agent: graph, nodes, state, tools, prompts |
| `src/lib/langchain/` | LLM and embeddings configuration |
| `src/lib/supabase/` | Supabase clients (browser, server, admin) |
| `src/app/api/` | API routes: upload, chat, documents, conversations, summary |
| `src/components/` | React components: chat, documents, summary, UI primitives |
| `mcp-servers/` | MCP server packages: glossary, web search |
| `docs/` | Project spec and weekly execution plans |

## Model Swapping

To change LLM provider, edit only two files:
- `src/lib/langchain/model.ts` — Chat model
- `src/lib/langchain/embeddings.ts` — Embedding model

If switching embedding providers, re-embed all documents and update the `vector(768)` column size.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui |
| Backend | Next.js API routes, LangGraph (TypeScript), LangChain.js |
| Database | Supabase (Postgres + pgvector) |
| LLM | Google Gemini 2.5 Flash |
| Embeddings | Gemini text-embedding-004 (768d) |
| PDF Parsing | pdf-parse + LlamaParse (optional) |
| External Tools | Custom MCP servers (glossary, web search) |
