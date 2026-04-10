# Legal Document Analysis Platform

## Architecture

```
Ingestion:  PDF Upload → Parse → Extract Tables → Chunk → Generate Table Descriptions → Detect Document Type → Embed → Store

Query:      User → Next.js Frontend → API Routes (SSE streaming) → LangGraph Agent
                                                                        ├── Classify Query (6 types)
                                                                        ├── Retrieve (pgvector + sub-queries)
                                                                        ├── Evaluate Context (retry loop, max 3)
                                                                        ├── Query Table (structured extraction)
                                                                        ├── Call Tools (glossary, web search)
                                                                        ├── Compare (cross-document)
                                                                        └── Synthesize (citations + source attribution)
```

## Tech Stack

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), Tailwind CSS v4                 |
| Backend        | Next.js API routes, LangGraph (TypeScript), LangChain.js |
| Database       | Supabase (Postgres + pgvector)                           |
| Auth           | Supabase Auth (email/password)                           |
| LLM            | Google Gemini 2.5 Flash                                  |
| Embeddings     | Gemini embedding-001 (768d)                              |
| PDF Parsing    | pdf-parse + LlamaParse (optional)                        |
| External Tools | Custom MCP servers (glossary, web search)                |

## Features

- **Table-Aware Ingestion** — Detects tables via LlamaParse or Gemini fallback, generates NL descriptions, preserves structured data
- **Multi-Step Agent** — LangGraph agent classifies queries (6 types), iterates on retrieval with LLM-guided retry, extracts table values, calls external tools
- **Streaming Chat** — SSE-based streaming with token-by-token display and expandable citation cards
- **MCP Tools** — Legal glossary (59 terms with fuzzy matching), optional Brave web search
- **Cross-Document Comparison** — Compare multiple documents with per-document color-coded attribution
- **Multi-Document Selection** — Chat with multiple documents simultaneously
- **Risk & Gap Analysis** — Auto-generated summaries, severity-rated risk flags (high/medium/low), coverage matrix per document type
- **Adaptive Prompts** — System prompts tuned for insurance, lease, employment, NDA, and ToS documents
- **Auto Document Type Detection** — Ingestion pipeline automatically classifies uploaded documents
- **Auth & Dark Mode** — Supabase Auth (email/password), dark/light theme toggle
- **Citation Preview** — Click a citation to open a slide-out side panel with source chunk, section title, and page number
- **Export** — Copy assistant messages to clipboard; download full summary reports (summary, risks, gaps) as markdown
- **Upload Progress** — Step-by-step progress indicator during PDF ingestion (parsing → table extraction → chunking → embedding)
- **Conversation Management** — Rename and delete conversations via sidebar
- **Document Management** — Delete uploaded documents from the dashboard

## Getting Started

See [docs/deployment.md](docs/deployment.md) for local development setup and production deployment (Vercel + Supabase).

## Key Directories

| Directory            | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `src/lib/ingestion/` | PDF parsing, table extraction, chunking, embedding pipeline |
| `src/lib/agent/`     | LangGraph agent: graph, nodes, state, tools, prompts        |
| `src/lib/langchain/` | LLM and embeddings configuration                            |
| `src/lib/supabase/`  | Supabase clients (browser, server, admin)                   |
| `src/app/api/`       | API routes: upload, chat, documents, conversations, summary |
| `src/app/(auth)/`    | Login and signup pages                                      |
| `src/components/`    | React components: chat, documents, summary, UI primitives   |
| `src/types/`         | Shared TypeScript type definitions                          |
| `mcp-servers/`       | MCP server packages: glossary, web search                   |
| `docs/`              | Project spec, deployment guide, and execution plans         |

## Model Swapping

To change LLM provider, edit only two files:

- `src/lib/langchain/model.ts` — Chat model
- `src/lib/langchain/embeddings.ts` — Embedding model

If switching embedding providers, re-embed all documents and update the `vector(768)` column size.
