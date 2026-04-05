# Legal Document Analysis Platform

[![CI](https://github.com/sarthak-mallick/Legal-Document-Analysis/actions/workflows/ci.yml/badge.svg)](https://github.com/sarthak-mallick/Legal-Document-Analysis/actions/workflows/ci.yml)

AI-powered platform for uploading legal documents (insurance policies, leases, contracts, NDAs) and asking natural language questions about them. Uses RAG with a multi-step LangGraph agent, table-aware PDF processing, MCP tool integration, and cross-document comparison.

## Features

- **Table-Aware Ingestion** — Detects tables via LlamaParse or Gemini fallback, generates NL descriptions, preserves structured data
- **Multi-Step Agent** — LangGraph agent classifies queries, iterates on retrieval, extracts table values, calls external tools
- **Streaming Chat** — SSE-based streaming with token-by-token display and expandable citation cards
- **MCP Tools** — Legal glossary (50+ terms with fuzzy matching), optional Brave web search
- **Cross-Document Comparison** — Compare multiple documents with per-document attribution
- **Risk & Gap Analysis** — Auto-generated summaries, severity-rated risk flags, coverage matrix per document type
- **Adaptive Prompts** — System prompts tuned for insurance, lease, employment, NDA, and ToS documents
- **Auth & Dark Mode** — Supabase Auth (email/password), dark/light theme toggle

## Local Development

No login required — auth is bypassed in development mode with a dev user ID.

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

**Option A: Local Supabase (recommended)**

```bash
npx supabase start
# Copy the output URLs and keys into .env.local
```

**Option B: Supabase Cloud (free tier)**

Create a project at [supabase.com](https://supabase.com), then copy credentials from Settings > API.

### 3. Run the database migration

```bash
# Local Supabase
npx supabase db reset

# Cloud Supabase — paste the contents of supabase/migrations/001_initial_schema.sql
# into the SQL Editor in the Supabase dashboard
```

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the required values:

| Variable                        | Required | Description                                                |
| ------------------------------- | -------- | ---------------------------------------------------------- |
| `GEMINI_API_KEY`                | Yes      | Google Gemini API key                                      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon key                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key                                  |
| `LLAMA_PARSE_API_KEY`           | No       | Enables LlamaParse table extraction (falls back to Gemini) |
| `BRAVE_SEARCH_API_KEY`          | No       | Enables web search tool in the agent                       |

### 5. Start the dev server

```bash
npm run dev
# Open http://localhost:3000
```

Upload a PDF at `/dashboard`, then ask questions at `/chat`.

## Production Deployment (Vercel)

Auth is enforced in production — unauthenticated users are redirected to `/login`.

### 1. Push to GitHub

```bash
git remote add origin <your-github-repo-url>
git push -u origin feature
```

### 2. Deploy on Vercel

- Import the repo at [vercel.com](https://vercel.com) — Vercel auto-detects Next.js
- Add all environment variables from `.env.example` in the Vercel dashboard (Settings > Environment Variables)
- Enable **Fluid Compute** if ingestion or chat requests time out (the agent makes multiple LLM calls per request)

### 3. Configure Supabase for production

- Use a **Supabase Cloud** project (not local)
- Ensure the migration has been run (tables, RLS policies, `match_chunks` function)
- In Supabase dashboard > Authentication > URL Configuration, add your Vercel deployment URL to the **Site URL** and **Redirect URLs**
- Email confirmation: In Authentication > Providers > Email, you can disable "Confirm email" for easier testing, or leave it on for security

### 4. Create your account

- Visit your deployed URL — you'll be redirected to `/signup`
- Create an account with email and password
- You're now authenticated and can upload documents, chat, and generate summaries

### 5. Lock down signups (optional)

To prevent others from creating accounts, disable signups in Supabase dashboard: Authentication > Providers > Email > uncheck "Allow new users to sign up". Your existing account will continue to work.

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

| Directory            | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `src/lib/ingestion/` | PDF parsing, table extraction, chunking, embedding pipeline |
| `src/lib/agent/`     | LangGraph agent: graph, nodes, state, tools, prompts        |
| `src/lib/langchain/` | LLM and embeddings configuration                            |
| `src/lib/supabase/`  | Supabase clients (browser, server, admin)                   |
| `src/app/api/`       | API routes: upload, chat, documents, conversations, summary |
| `src/app/(auth)/`    | Login and signup pages                                      |
| `src/components/`    | React components: chat, documents, summary, UI primitives   |
| `mcp-servers/`       | MCP server packages: glossary, web search                   |
| `docs/`              | Project spec and weekly execution plans                     |

## Model Swapping

To change LLM provider, edit only two files:

- `src/lib/langchain/model.ts` — Chat model
- `src/lib/langchain/embeddings.ts` — Embedding model

If switching embedding providers, re-embed all documents and update the `vector(768)` column size.

## Tech Stack

| Layer          | Technology                                               |
| -------------- | -------------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui      |
| Backend        | Next.js API routes, LangGraph (TypeScript), LangChain.js |
| Database       | Supabase (Postgres + pgvector)                           |
| Auth           | Supabase Auth (email/password)                           |
| LLM            | Google Gemini 2.5 Flash                                  |
| Embeddings     | Gemini text-embedding-004 (768d)                         |
| PDF Parsing    | pdf-parse + LlamaParse (optional)                        |
| External Tools | Custom MCP servers (glossary, web search)                |
