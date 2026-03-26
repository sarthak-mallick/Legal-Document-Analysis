# CLAUDE.md

Follow all project policy in AGENTS.md (source of truth order, scope discipline, etc.).

## Project

AI-powered legal document analysis platform using RAG + LangGraph agent.
Full spec: `docs/project-spec.md`

## Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui
- **Backend:** Next.js API routes, LangGraph (TypeScript), LangChain.js
- **Database:** Supabase (Postgres + pgvector), Supabase Auth
- **LLM:** Google Gemini 2.5 Flash via `@langchain/google-genai`
- **Embeddings:** Gemini `text-embedding-004` (768 dimensions)
- **PDF Parsing:** `pdf-parse` + LlamaParse (optional, for table extraction)
- **External Tools:** Custom MCP servers (glossary, web search)
- **Hosting:** Vercel

## Commands

```bash
npm run dev        # Start dev server (Next.js)
npm run build      # Production build
npm run typecheck  # TypeScript check (tsc --noEmit)
```

## Key Directories

- `src/lib/ingestion/` — PDF parsing, chunking, embedding pipeline
- `src/lib/agent/` — LangGraph agent (graph, nodes, tools, prompts)
- `src/lib/langchain/` — LLM and embeddings config (swap models here)
- `src/lib/supabase/` — Supabase clients (browser, server, admin)
- `src/app/api/` — API routes (upload, chat, documents, conversations, summary)
- `mcp-servers/` — MCP server packages (glossary, web search)
- `docs/` — Project spec, weekly execution plans, agent workflow

## Conventions

- Use App Router patterns (server components by default, `"use client"` only when needed)
- Required env vars: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional env vars: `LLAMA_PARSE_API_KEY` (table extraction), `BRAVE_SEARCH_API_KEY` (web search)
- Never commit `.env.local` or secrets
- Embeddings are 768-dimensional vectors — if changing embedding provider, update DB column size
