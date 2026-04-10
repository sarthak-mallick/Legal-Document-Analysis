# Deployment Guide

## Commands

```bash
npm run dev            # Start dev server (http://localhost:3000)
npm run build          # Production build
npm run typecheck      # TypeScript check (tsc --noEmit)
npm test               # Run unit tests
npm run test:coverage  # Run tests with coverage report
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without writing
```

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

**Option A: Local Supabase (recommended)**

> Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running before you start.

```bash
npx supabase start
# Copy the output URLs and keys into .env.local
```

**Option B: Supabase Cloud (free tier)**

Create a project at [supabase.com](https://supabase.com), then copy credentials from Settings > API.

### 3. Run the database migration

**Option A: Local Supabase**

```bash
npx supabase db reset
```

**Option B: Supabase Cloud**

Open the [SQL Editor](https://supabase.com/dashboard/project/_/sql) in your Supabase dashboard, paste the contents of `supabase/migrations/001_initial_schema.sql`, and run it.

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

#### Credentials & API Keys

| Variable                        | Required | Description                                                |
| ------------------------------- | -------- | ---------------------------------------------------------- |
| `GEMINI_API_KEY`                | Yes      | Google Gemini API key                                      |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Supabase project URL                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anon key                                          |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes      | Supabase service role key                                  |
| `LLAMA_PARSE_API_KEY`           | No       | Enables LlamaParse table extraction (falls back to Gemini) |
| `BRAVE_SEARCH_API_KEY`          | No       | Enables web search tool in the agent                       |

#### Model Overrides

| Variable                 | Default                | Description                          |
| ------------------------ | ---------------------- | ------------------------------------ |
| `GEMINI_CHAT_MODEL`      | `gemini-2.5-flash`     | Google Generative AI chat model      |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Google Generative AI embedding model |
| `MAX_UPLOAD_SIZE_MB`     | 10                     | Maximum PDF upload size in MB        |

#### RAG Hyperparameters

All optional. Defaults work well out of the box — tune these when experimenting with retrieval quality.

| Variable                     | Default | Range to try   | Description                                                                                                                                                                   |
| ---------------------------- | ------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CHUNK_SIZE`                 | 1000    | 500, 800, 1200 | Target chunk size in characters. Smaller chunks give more precise retrieval but less context per chunk; larger chunks preserve more context but reduce retrieval granularity. |
| `CHUNK_OVERLAP`              | 200     | 100, 200, 300  | Character overlap between consecutive chunks. Higher overlap reduces information loss at chunk boundaries but increases total chunk count and storage.                        |
| `SIMILARITY_THRESHOLD`       | 0.4     | 0.3 - 0.6      | Minimum cosine similarity score for a retrieved chunk to be included. Too low introduces noise; too high drops relevant but loosely matching chunks.                          |
| `RETRIEVAL_TOP_K`            | 5       | 5, 8, 10       | Number of top chunks returned per vector search query. More chunks improve recall but add noise and increase token usage in the synthesis prompt.                             |
| `LLM_TEMPERATURE`            | 0.2     | 0, 0.1, 0.2    | Controls LLM response randomness. Lower values produce more deterministic, factual outputs — best for legal document extraction.                                              |
| `MAX_RETRIEVAL_ATTEMPTS`     | 3       | 2 - 5          | Maximum retrieval-evaluation loop iterations before the agent proceeds with available context. Higher values improve recall for hard questions but increase latency.          |
| `MAX_SUB_QUERIES`            | 3       | 2 - 5          | Maximum sub-queries generated for multi-section or cross-document questions. More sub-queries improve recall but add LLM calls and latency.                                   |
| `EVAL_CHUNK_SAMPLE`          | 8       | 5 - 15         | Number of retrieved chunks shown to the sufficiency evaluator. More chunks give the evaluator a better picture but increase token usage.                                      |
| `EVAL_SNIPPET_LENGTH`        | 200     | 150 - 500      | Characters per chunk shown to the sufficiency evaluator. Longer snippets help the evaluator judge relevance but cost more tokens.                                             |
| `EMBEDDING_BATCH_SIZE`       | 50      | 20 - 100       | Chunks processed per embedding API call during ingestion. Larger batches are faster but may hit API rate limits or payload size limits.                                       |
| `CONVERSATION_HISTORY_LIMIT` | 10      | 6, 10, 20      | Number of recent messages loaded as context for follow-up questions. More history improves multi-turn coherence but increases token usage.                                    |
| `SUMMARY_CONTEXT_CHUNKS`     | 30      | 20, 30, 50     | Number of document chunks fed to the summary/risk/gap generation prompts. More chunks produce richer analysis but risk exceeding model token limits.                          |

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
git push -u origin main
```

### 2. Deploy on Vercel

- Import the repo at [vercel.com](https://vercel.com) — Vercel auto-detects Next.js
- Add all **required** environment variables in the Vercel dashboard (Settings > Environment Variables).
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
