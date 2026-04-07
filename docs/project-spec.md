# Legal Document Analysis Platform - Project Specification

## Project Overview

An AI-powered platform that helps users upload legal documents (insurance policies, lease agreements, contracts) and ask natural language questions about them. The system uses RAG (Retrieval-Augmented Generation) with a multi-step LangGraph agent that can reason across document sections, extract values from tables, look up legal terminology via MCP servers, and compare multiple documents.

## Tech Stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| Frontend       | Next.js 16 (App Router)                          |
| Hosting        | Vercel (Hobby tier)                              |
| Database       | Supabase (Free tier) - Postgres + pgvector       |
| Auth           | Supabase Auth                                    |
| LLM            | Google Gemini 2.5 Flash (via LangChain)          |
| Embeddings     | Google Gemini text-embedding-004 (via LangChain) |
| Orchestration  | LangGraph (TypeScript)                           |
| Framework      | LangChain.js                                     |
| External Tools | Custom MCP servers (TypeScript, MCP SDK)         |
| PDF Parsing    | LlamaParse or pdf-parse + custom table detection |
| Styling        | Tailwind CSS v4 + shadcn/ui                      |
| Testing        | Vitest + @vitest/coverage-v8                     |
| Linting        | ESLint 9 + Prettier + husky/lint-staged          |
| CI             | GitHub Actions (lint, typecheck, test)           |

## Architecture Summary

```
User → Next.js Frontend → API Routes (streaming) → LangGraph Agent
                                                        ├── LangChain → Gemini (LLM reasoning)
                                                        ├── LangChain → Supabase pgvector (RAG retrieval)
                                                        ├── MCP Server → Legal Glossary Tool
                                                        ├── MCP Server → Web Search Tool
                                                        └── Table Query Tool → Supabase metadata
```

## Database Schema

### Supabase Setup

Enable the `vector` extension in Supabase SQL editor:

```sql
create extension if not exists vector;
```

### Tables

```sql
-- Users (handled by Supabase Auth, extend with profile if needed)

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  file_size integer,
  document_type text, -- 'insurance_policy', 'lease', 'contract', 'nda', 'terms_of_service', 'unknown'
  upload_status text default 'processing', -- 'processing', 'ready', 'error'
  page_count integer,
  summary text, -- auto-generated summary after processing
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document chunks with embeddings
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null, -- the chunk text
  chunk_index integer not null, -- ordering within the document
  chunk_type text default 'text', -- 'text', 'table', 'heading', 'list'
  section_title text, -- the section this chunk belongs to (e.g., "Liability Coverage")
  page_number integer,
  embedding vector(768), -- Gemini text-embedding-004 produces 768 dimensions
  metadata jsonb default '{}', -- stores raw table data, surrounding context, etc.
  created_at timestamptz default now()
);

-- Conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  document_ids uuid[] default '{}', -- which documents this conversation references
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages within conversations
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null, -- 'user', 'assistant'
  content text not null,
  citations jsonb default '[]', -- [{chunk_id, section_title, page_number, snippet}]
  tool_calls jsonb default '[]', -- log of MCP/tool calls made for this response
  created_at timestamptz default now()
);

-- Indexes
create index idx_chunks_document on document_chunks(document_id);
create index idx_chunks_embedding on document_chunks using hnsw (embedding vector_cosine_ops);
create index idx_messages_conversation on messages(conversation_id);
create index idx_documents_user on documents(user_id);
create index idx_conversations_user on conversations(user_id);

-- RLS policies
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

create policy "Users can manage own documents" on documents for all using (auth.uid() = user_id);
create policy "Users can read own chunks" on document_chunks for all using (
  document_id in (select id from documents where user_id = auth.uid())
);
create policy "Users can manage own conversations" on conversations for all using (auth.uid() = user_id);
create policy "Users can manage own messages" on messages for all using (
  conversation_id in (select id from conversations where user_id = auth.uid())
);
```

### Vector similarity search function

```sql
create or replace function match_chunks(
  query_embedding vector(768),
  match_count int default 5,
  filter_document_ids uuid[] default null
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  chunk_type text,
  section_title text,
  page_number integer,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_type,
    dc.section_title,
    dc.page_number,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where (filter_document_ids is null or dc.document_id = any(filter_document_ids))
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;
```

---

## Project Directory Structure

```
legal-doc-analyzer/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing/home page
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── not-found.tsx             # Custom 404 page
│   │   ├── global-error.tsx          # Root layout error fallback
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx              # Document list + upload
│   │   │   └── [documentId]/
│   │   │       └── page.tsx          # Single document view
│   │   ├── chat/
│   │   │   ├── page.tsx              # New chat
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx          # Existing conversation
│   │   └── api/
│   │       ├── upload/route.ts       # PDF upload + processing trigger
│   │       ├── chat/route.ts         # Streaming chat endpoint
│   │       ├── documents/
│   │       │   ├── route.ts          # CRUD for documents
│   │       │   └── [id]/route.ts     # Single document operations (delete)
│   │       ├── conversations/
│   │       │   └── route.ts
│   │       └── summary/
│   │           └── [documentId]/route.ts  # Generate document summary
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   ├── server.ts             # Server-side Supabase client
│   │   │   └── admin.ts              # Service role client for background tasks
│   │   │
│   │   ├── ingestion/
│   │   │   ├── pdf-parser.ts         # PDF extraction with table detection
│   │   │   ├── chunker.ts            # Table-aware chunking logic
│   │   │   ├── table-extractor.ts    # Extract and structure tables from PDF
│   │   │   ├── table-describer.ts   # Generate NL descriptions for tables
│   │   │   ├── embedder.ts           # Generate embeddings via Gemini
│   │   │   ├── doc-type-detector.ts  # Classify document type
│   │   │   └── pipeline.ts           # Orchestrates the full ingestion flow
│   │   │
│   │   ├── agent/
│   │   │   ├── graph.ts              # Main LangGraph state machine
│   │   │   ├── state.ts              # Agent state type definitions
│   │   │   ├── nodes/
│   │   │   │   ├── classify-query.ts     # Determine question type
│   │   │   │   ├── retrieve.ts           # Vector search retrieval
│   │   │   │   ├── evaluate-context.ts   # Check if retrieved context is sufficient
│   │   │   │   ├── query-table.ts        # Structured lookup within table data
│   │   │   │   ├── synthesize.ts         # Generate final answer with citations
│   │   │   │   └── call-tools.ts         # MCP tool invocation node
│   │   │   ├── tools/
│   │   │   │   ├── retriever-tool.ts     # Wraps pgvector retrieval as a tool
│   │   │   │   ├── table-query-tool.ts   # Queries structured table data
│   │   │   │   └── mcp-tools.ts          # In-app glossary lookup and web search (inlined, not separate MCP servers)
│   │   │   └── prompts/
│   │   │       ├── system.ts             # System prompts for different agent modes
│   │   │       └── synthesis.ts          # Answer synthesis prompt with citation instructions
│   │   │
│   │   ├── langchain/
│   │   │   ├── model.ts              # Gemini LLM config (easy to swap)
│   │   │   ├── embeddings.ts         # Gemini embeddings config (easy to swap)
│   │   │   └── vectorstore.ts        # Supabase pgvector store setup
│   │   │
│   │   ├── validations/
│   │   │   ├── index.ts              # Shared Zod helpers (parseBody, uuidSchema)
│   │   │   └── chat.ts              # Chat request body schema
│   │   │
│   │   ├── env.ts                    # Environment variable helpers
│   │   ├── env-check.ts             # Startup env validation (fails fast)
│   │   ├── auth.ts                  # User ID resolution with dev bypass
│   │   └── utils.ts                 # Tailwind class name utility
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── chat/
│   │   │   ├── ChatPageClient.tsx    # Chat page orchestrator
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── CitationCard.tsx      # Shows source section when clicked
│   │   │   ├── StreamingMessage.tsx
│   │   │   ├── ConversationSidebar.tsx
│   │   │   └── DocumentSelector.tsx
│   │   ├── documents/
│   │   │   ├── UploadDropzone.tsx
│   │   │   ├── UploadDashboard.tsx
│   │   │   ├── DocumentCard.tsx
│   │   │   ├── ProcessingStatus.tsx
│   │   │   └── ChunkDebugPanel.tsx
│   │   └── summary/
│   │       ├── CoverageSummary.tsx
│   │       ├── DocumentSummaryPanel.tsx
│   │       └── GapAnalysis.tsx
│   │
│   └── types/
│       ├── document.ts
│       ├── conversation.ts
│       └── api.ts
│
├── mcp-servers/
│   ├── glossary-server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts              # MCP server entry point
│   │   │   ├── glossary-data.ts      # Insurance/legal term definitions
│   │   │   └── tools.ts              # Tool definitions (lookup_term, list_terms)
│   │   └── data/
│   │       └── glossary.json         # Curated glossary of 200+ legal/insurance terms
│   │
│   └── web-search-server/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts              # MCP server entry point
│           └── tools.ts              # Tool definitions (search_web, fetch_page)
│
├── supabase/
│   ├── config.toml                   # Local Supabase config
│   └── migrations/
│       └── 001_initial_schema.sql    # Database schema from above
│
├── .env.local                        # GEMINI_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, etc.
├── .env.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── eslint.config.mjs
├── vitest.config.ts
├── vercel.json
├── .prettierrc
└── README.md
```

---

## Weekly Implementation Plan

---

### WEEK 1: Project Setup & Basic PDF Ingestion

**Goal:** Upload a PDF, extract text, chunk it, embed it, and store it in Supabase pgvector.

**Tasks:**

1. **Project initialization**
   - Create Next.js 16 app with App Router, TypeScript, Tailwind CSS v4, shadcn/ui
   - Install dependencies: `@langchain/google-genai`, `@langchain/core`, `langchain`, `@supabase/supabase-js`, `@supabase/ssr`
   - Set up Supabase project (cloud, free tier) with pgvector extension enabled
   - Create `.env.local` with `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - Set up Supabase Auth (email/password is fine for now)
   - Run the database migration (schema above)

2. **Supabase client setup** (`src/lib/supabase/`)
   - Browser client for frontend
   - Server client for API routes
   - Admin client (service role) for background processing that bypasses RLS

3. **LangChain model configuration** (`src/lib/langchain/`)
   - `model.ts`: Initialize `ChatGoogleGenerativeAI` with `gemini-2.5-flash`. Export a function `getLLM()` so swapping models later means changing only this file.
   - `embeddings.ts`: Initialize `GoogleGenerativeAIEmbeddings` with `text-embedding-004` (768 dimensions). Export a function `getEmbeddings()`.
   - `vectorstore.ts`: Initialize `SupabaseVectorStore` connected to `document_chunks` table. Export retriever factory function.

4. **Basic PDF parsing** (`src/lib/ingestion/pdf-parser.ts`)
   - Use `pdf-parse` npm package to extract raw text from uploaded PDFs
   - Extract page count, detect basic structure (headings, paragraphs)
   - Return structured output: `{ pages: [{ pageNumber, text }], metadata: { pageCount, title? } }`
   - Handle errors gracefully (corrupted PDFs, password-protected files)

5. **Basic chunking** (`src/lib/ingestion/chunker.ts`)
   - Implement `RecursiveCharacterTextSplitter` from LangChain with:
     - `chunkSize: 1000`
     - `chunkOverlap: 200`
   - Preserve section titles: detect lines that look like headings (ALL CAPS, numbered sections, bold patterns) and attach as metadata
   - Each chunk gets: `{ content, chunkIndex, sectionTitle, pageNumber, chunkType: 'text' }`

6. **Embedding & storage** (`src/lib/ingestion/embedder.ts`)
   - Take array of chunks, generate embeddings in batches (to respect Gemini rate limits — batch 5 at a time with 1s delay between batches)
   - Insert chunks with embeddings into `document_chunks` table
   - Include retry logic for rate limit errors (429)

7. **Ingestion pipeline** (`src/lib/ingestion/pipeline.ts`)
   - Orchestrate: receive file → parse PDF → chunk → embed → store
   - Update `documents` table status: 'processing' → 'ready' or 'error'
   - Log progress for debugging

8. **Upload API route** (`src/app/api/upload/route.ts`)
   - Accept multipart form data with PDF file
   - Validate: must be PDF, max 10MB
   - Create `documents` record with status 'processing'
   - Run ingestion pipeline
   - Return document ID and status

9. **Basic upload UI** (`src/app/dashboard/page.tsx`)
   - Simple drag-and-drop upload zone using a basic dropzone component
   - Show upload progress and processing status
   - List uploaded documents with filename, date, status, page count
   - Delete button that removes document + all associated chunks from Supabase

**Deliverable:** Can upload a PDF, see it listed in the dashboard, and verify in Supabase that chunks and embeddings are stored correctly.

---

### WEEK 2: Table-Aware PDF Processing

**Goal:** Detect and properly handle tables in PDFs so they aren't destroyed during chunking.

**Tasks:**

1. **Table detection and extraction** (`src/lib/ingestion/table-extractor.ts`)
   - Integrate `LlamaParse` (free tier: 1000 pages/day) as the primary parser. It returns structured markdown with tables preserved.
   - Fallback: if LlamaParse is unavailable or over limit, use `pdf-parse` with heuristic table detection:
     - Detect table-like patterns: rows with consistent column alignment, delimiter patterns, repeated whitespace structure
     - Use Gemini to confirm: send the suspected table text to Gemini with prompt "Is this a table? If yes, convert it to a markdown table. If no, return it as-is."
   - Output tables as structured objects: `{ markdown: string, headers: string[], rows: string[][], rawText: string }`

2. **Table-aware chunking** (`src/lib/ingestion/chunker.ts` — extend)
   - Tables are treated as atomic units — never split across chunks
   - Each table chunk includes:
     - The table itself (as markdown)
     - The section heading above it
     - The paragraph immediately before the table (provides context for what the table shows)
   - Set `chunkType: 'table'` for table chunks
   - Store raw table data (headers + rows) in `metadata` jsonb column for later structured querying

3. **Table description generation** (add to `src/lib/ingestion/pipeline.ts`)
   - For each table chunk, call Gemini to generate a natural language description
   - Prompt: "Describe what this table shows in 2-3 sentences. Include the range of values and what the columns/rows represent. Table: {markdown_table}"
   - Store the description as the chunk's `content` (this is what gets embedded for vector search)
   - Store the original markdown table in `metadata.table_markdown`
   - Store structured data in `metadata.table_data` (headers + rows as JSON)
   - This dual representation means: the description matches how users phrase questions (good for retrieval), the raw data allows precise value extraction (good for answering)

4. **Update embedder for dual representation**
   - Embed the natural language description (not the raw table) — descriptions match user queries better
   - Ensure metadata is preserved through the embedding pipeline

5. **Document type detection** (`src/lib/ingestion/doc-type-detector.ts`)
   - After parsing, send the first 2-3 pages to Gemini with prompt:
     "Classify this document as one of: insurance_policy, lease_agreement, employment_contract, nda, terms_of_service, other. Also extract: document title, issuing party, effective date if visible. Respond as JSON."
   - Store the classification in `documents.document_type`
   - This will be used later for adaptive agent behavior

6. **Update upload UI**
   - Show detected document type after processing
   - Show chunk count and table count
   - Add a "View Chunks" debug panel (collapsible) that shows how the document was split — useful for development and debugging

**Deliverable:** Upload a policy PDF with tables, verify in Supabase that tables are stored as atomic chunks with both descriptions and raw structured data. The debug panel confirms correct splitting.

---

### WEEK 3: Basic RAG Chat

**Goal:** Ask questions about an uploaded document and get accurate answers with citations.

**Tasks:**

1. **Vector search retrieval** (`src/lib/agent/tools/retriever-tool.ts`)
   - Create a function that takes a query string and optional document IDs
   - Embed the query using Gemini embeddings
   - Call the `match_chunks` Supabase function
   - Return top 5 most relevant chunks with similarity scores
   - Filter out chunks below a similarity threshold (e.g., 0.7)

2. **Basic chat API with streaming** (`src/app/api/chat/route.ts`)
   - Accept: `{ message: string, conversationId?: string, documentIds: string[] }`
   - If no conversationId, create a new conversation
   - Retrieve relevant chunks using the retriever
   - Build a prompt that includes:
     - System instructions (you are a legal document analyst, cite sources, etc.)
     - Retrieved chunks formatted with section titles and page numbers
     - Conversation history (last 10 messages from the conversation)
     - The user's question
   - Call Gemini via LangChain with streaming enabled
   - Use `StreamingTextResponse` from the Vercel AI SDK or manual `ReadableStream`
   - Save both user message and assistant response to `messages` table
   - Include citation data: which chunks were used, their section titles and page numbers

3. **Citation tracking**
   - In the synthesis prompt, instruct Gemini to reference sources as `[Section: X, Page: Y]`
   - Parse the response to extract citations
   - Store citations in the `messages.citations` jsonb column
   - Each citation links back to a specific chunk ID

4. **Chat UI** (`src/app/chat/`)
   - Chat window with message history
   - Streaming message display (tokens appear as they arrive)
   - Document selector: dropdown or sidebar to choose which document(s) to query
   - Citation cards: clickable references in the response that expand to show the source chunk text, section title, and page number
   - Input area with send button and keyboard shortcut (Enter to send)

5. **Conversation management**
   - List previous conversations in sidebar
   - Auto-generate conversation title from first message (use Gemini: "Summarize this question in 5 words or less: {message}")
   - Delete conversation functionality

6. **Prompt engineering** (`src/lib/agent/prompts/`)
   - `system.ts`: Craft a system prompt for a legal document analyst that:
     - Always cites specific sections and page numbers
     - Admits when information isn't found in the document
     - Uses plain English to explain legal terms
     - Distinguishes between what the document says vs. general knowledge
   - `synthesis.ts`: Prompt template for answer generation that includes retrieved context

**Deliverable:** Can chat with an uploaded document, get streaming responses with accurate citations that reference specific sections and pages. Conversation history is preserved.

---

### WEEK 4: LangGraph Agent

**Goal:** Replace the simple RAG chain with a multi-step LangGraph agent that can reason, loop, and make decisions.

**Tasks:**

1. **Define agent state** (`src/lib/agent/state.ts`)

   ```typescript
   interface AgentState {
     query: string;
     queryType:
       | "simple_factual"
       | "table_lookup"
       | "term_explanation"
       | "multi_section"
       | "cross_document"
       | "general";
     documentIds: string[];
     conversationHistory: Message[];
     retrievedChunks: ChunkWithScore[];
     retrievalAttempts: number;
     tableData: TableQueryResult | null;
     toolResults: ToolResult[];
     contextSufficient: boolean;
     response: string;
     citations: Citation[];
   }
   ```

2. **Classify Query node** (`src/lib/agent/nodes/classify-query.ts`)
   - Send the user's question to Gemini with a classification prompt
   - Categories:
     - `simple_factual`: "What is my deductible?" — single retrieval usually enough
     - `table_lookup`: "What are my coverage limits?" — needs table data
     - `term_explanation`: "What does subrogation mean in my policy?" — may need glossary + context
     - `multi_section`: "Am I covered for rental car accidents?" — needs multiple sections
     - `cross_document`: "Which policy covers water damage?" — needs multi-document retrieval
     - `general`: Greetings, off-topic, clarification requests
   - Output: updated state with `queryType` set

3. **Retrieve node** (`src/lib/agent/nodes/retrieve.ts`)
   - Perform vector search against pgvector
   - For `multi_section` queries: generate 2-3 sub-queries from the original question (use Gemini: "Break this question into specific sub-queries to search a legal document") and retrieve for each
   - For `cross_document` queries: retrieve across all user's documents
   - Deduplicate results by chunk ID
   - Add results to `retrievedChunks` in state
   - Increment `retrievalAttempts`

4. **Evaluate Context node** (`src/lib/agent/nodes/evaluate-context.ts`)
   - Send retrieved chunks + original question to Gemini
   - Prompt: "Given this question and the retrieved context, do you have enough information to provide a complete, accurate answer? Respond with JSON: { sufficient: boolean, missing: string, refinedQuery?: string }"
   - If sufficient: set `contextSufficient: true`
   - If not sufficient AND `retrievalAttempts < 3`: return to Retrieve with `refinedQuery`
   - If not sufficient AND `retrievalAttempts >= 3`: set `contextSufficient: true` anyway (will answer with caveat about incomplete information)

5. **Table Query node** (`src/lib/agent/nodes/query-table.ts`)
   - Activated when retrieved chunks include table data (`chunkType === 'table'`)
   - Extract the specific value from the structured table data in `metadata.table_data`
   - Use Gemini to interpret: "Given this table {headers, rows} and the question '{query}', which cell(s) contain the answer? Respond with the specific value(s)."
   - Add result to state as `tableData`

6. **Synthesize node** (`src/lib/agent/nodes/synthesize.ts`)
   - Combine all gathered context: retrieved chunks, table data, tool results
   - Build a synthesis prompt with all context and clear citation instructions
   - Call Gemini with streaming
   - Parse response for citations
   - Set `response` and `citations` in state

7. **Build the LangGraph graph** (`src/lib/agent/graph.ts`)

   ```
   START → classifyQuery
   classifyQuery → retrieve
   retrieve → evaluateContext
   evaluateContext → retrieve (if not sufficient and attempts < 3)
   evaluateContext → queryTable (if sufficient and table chunks present)
   evaluateContext → synthesize (if sufficient and no tables)
   queryTable → synthesize
   synthesize → END
   ```

   - Use conditional edges based on state values
   - Compile the graph

8. **Update chat API route**
   - Replace the simple chain from Week 3 with the LangGraph agent
   - Pass the graph's streaming output to the response
   - Log the full execution path (which nodes were visited) in `messages.tool_calls` for debugging

9. **Agent debug view** (optional but recommended)
   - In development mode, show which nodes the agent traversed for each response
   - Display: query classification, number of retrieval attempts, whether table query was used, confidence evaluation results
   - This helps with debugging and tuning the agent

**Deliverable:** Agent correctly classifies different question types, performs multi-step retrieval when needed, extracts values from tables, and produces better answers than the simple chain from Week 3.

---

### WEEK 5: MCP Integration

**Goal:** Build and connect custom MCP servers that give the agent access to external knowledge.

**Tasks:**

1. **MCP Glossary Server** (`mcp-servers/glossary-server/`)
   - Create a new Node.js project with the MCP TypeScript SDK (`@modelcontextprotocol/sdk`)
   - Curate a glossary JSON file with 50+ insurance and legal terms. Sources: public domain glossaries from state insurance departments, NAIC, and legal dictionaries.
   - Each entry: `{ term, definition, category, relatedTerms, examples? }`
   - Implement two MCP tools:
     - `lookup_term`: Input: `{ term: string }`. Output: definition, related terms, and examples. Use fuzzy matching so "deductable" matches "deductible".
     - `list_terms_by_category`: Input: `{ category: string }`. Output: list of terms in that category (e.g., "liability", "property", "auto", "health").
   - Server runs on stdio transport for local development
   - Test with MCP Inspector tool

2. **MCP Web Search Server** (`mcp-servers/web-search-server/`)
   - Create a new Node.js project with MCP SDK
   - Use Brave Search API (free tier: 2000 queries/month) or SerpAPI (100 free queries/month)
   - Implement two MCP tools:
     - `search_web`: Input: `{ query: string, count?: number }`. Output: array of `{ title, url, snippet }`. Useful for "is my deductible typical for this state?" type questions.
     - `fetch_page_content`: Input: `{ url: string }`. Output: extracted text content from the URL (use a simple HTML-to-text extraction). Useful for diving deeper into a search result.
   - Include rate limiting and error handling

3. **Connect MCP tools to LangGraph** (`src/lib/agent/tools/mcp-tools.ts`)
   - Inline the MCP tool logic directly in the Next.js process (Option A — simplest for single-user deployment, no separate server needed)
   - `lookupTerm()`: reads from the glossary JSON with fuzzy matching (Levenshtein distance)
   - `searchWeb()`: calls Brave Search API when `BRAVE_SEARCH_API_KEY` is configured

4. **Add tool-calling node to the graph** (`src/lib/agent/nodes/call-tools.ts`)
   - New node that the agent can route to when it decides external tools are needed
   - The agent decides which tools to call based on the query type and current context:
     - `term_explanation` queries → try glossary first
     - Questions about market norms or regulations → web search
   - Store tool results in `state.toolResults`

5. **Update the LangGraph graph** (`src/lib/agent/graph.ts`)
   - Add the tool-calling node to the graph
   - Add conditional edge from `classifyQuery`: if query needs external knowledge → `callTools` before or after `retrieve`
   - Add conditional edge from `evaluateContext`: if context is insufficient and tools haven't been tried yet → `callTools`
   - Updated graph:
     ```
     START → classifyQuery
     classifyQuery → callTools (if term_explanation or needs external context)
     classifyQuery → retrieve (for document-focused queries)
     callTools → retrieve
     retrieve → evaluateContext
     evaluateContext → retrieve (if not sufficient, attempts < 3)
     evaluateContext → callTools (if not sufficient and tools not yet called)
     evaluateContext → queryTable (if sufficient + table chunks)
     evaluateContext → synthesize (if sufficient)
     queryTable → synthesize
     synthesize → END
     ```

6. **Update synthesis prompt**
   - Include tool results in the synthesis context
   - Instruct the model to distinguish between information from the document vs. external sources
   - Example: "According to your policy (Section 3, Page 5), your deductible is $500. For context, this is below the national average of $750 for similar policies (source: web search)."

7. **Test with complex questions**
   - "What does 'actual cash value' mean in my policy?" → should use glossary MCP + document retrieval
   - "Is my liability limit high enough?" → should use web search for benchmarks + document retrieval
   - "Explain the subrogation clause and how it might affect me" → glossary + multi-section retrieval

**Deliverable:** Agent uses MCP tools when appropriate, integrates external knowledge into responses, and clearly distinguishes document-sourced vs. externally-sourced information.

---

### WEEK 6: Multi-Document Support & Comparison

**Goal:** Upload multiple documents and ask cross-document questions.

**Tasks:**

1. **Multi-document management UI**
   - Update dashboard to show all documents in a grid/list view
   - Allow selecting multiple documents for a chat session
   - Show document type badges (insurance policy, lease, contract, etc.)
   - Batch delete functionality

2. **Cross-document retrieval** (update `src/lib/agent/nodes/retrieve.ts`)
   - When multiple documents are selected, retrieve across all of them
   - Tag each retrieved chunk with its source document name and type
   - For comparison queries, ensure chunks are retrieved from each document

3. **Document comparison flow** (new node: `src/lib/agent/nodes/compare.ts`)
   - Activated for `cross_document` query types
   - Retrieve relevant sections from each document
   - Structure the comparison: build a side-by-side context for the LLM
   - Prompt: "Compare the following sections from Document A and Document B regarding {topic}. Highlight similarities, differences, and any gaps."

4. **Adaptive analysis profiles** (extend `src/lib/agent/prompts/system.ts`)
   - Different system prompt additions based on `document_type`:
     - Insurance policy: focus on coverage, exclusions, deductibles, limits, conditions
     - Lease agreement: focus on rent terms, obligations, maintenance, termination, fees, deposits
     - Employment contract: focus on compensation, benefits, non-compete, IP assignment, termination
     - NDA: focus on confidential information definition, duration, exclusions, remedies
   - The agent loads the appropriate profile based on the documents in the conversation

5. **Cross-document query handling in LangGraph**
   - Update `classifyQuery` to detect comparison questions: "which policy covers...", "compare my...", "difference between..."
   - Add the compare node to the graph with appropriate routing
   - Updated graph adds:
     ```
     evaluateContext → compare (if cross_document and context sufficient)
     compare → synthesize
     ```

6. **Source attribution in responses**
   - When answering cross-document queries, clearly label which information comes from which document
   - Citations include document name: `[Document: Home Insurance Policy, Section: Liability, Page: 12]`
   - Format comparison answers in a clear structure (not necessarily a table, but organized by document)

**Deliverable:** Can upload an insurance policy and a lease, then ask "Does my renter's insurance cover damage to the apartment?" and get an answer that references both documents.

---

### WEEK 7: Advanced Features

**Goal:** Add auto-generated summaries, gap analysis, and conversation memory.

**Tasks:**

1. **Auto-generated document summary** (`src/app/api/summary/[documentId]/route.ts`)
   - After document processing, generate a structured summary using the LangGraph agent
   - For insurance policies, the summary includes:
     - Policy type and provider
     - Coverage types and limits (extracted from table data)
     - Key exclusions
     - Deductible amounts
     - Notable conditions or riders
   - For leases: rent, term, key obligations, termination clauses, fees
   - Store summary in `documents.summary`
   - Display on the document detail page

2. **Coverage/clause summary dashboard** (`src/components/summary/CoverageSummary.tsx`)
   - Visual display of the auto-generated summary
   - Organized by category (coverage, exclusions, limits, conditions)
   - Each item is clickable and opens the source section in a side panel

3. **Gap analysis** (`src/components/summary/GapAnalysis.tsx`)
   - Define a checklist of common coverage categories per document type
   - For insurance: liability, collision, comprehensive, medical, uninsured motorist, personal property, etc.
   - Run the agent against each category: "Does this policy cover {category}? If yes, what are the limits?"
   - Display results as a coverage matrix: covered (green), not covered (red), partial/conditional (yellow)
   - Highlight items that are commonly expected but missing
   - This is a background process — run it after document processing and store results in metadata

4. **Conversation memory improvements**
   - Load conversation history efficiently (paginated)
   - The agent uses last 10 messages as context for follow-up questions
   - Handle pronoun resolution: if user says "what about for that?" the agent should understand from conversation history what "that" refers to
   - Store the full agent execution trace in `messages.tool_calls` for debugging

5. **Risk flagging** (add to synthesis)
   - During summary generation and Q&A, flag concerning clauses:
     - Unusually high deductibles
     - Broad exclusion clauses
     - Auto-renewal with price increase provisions
     - Short notification windows for termination
   - Display flags with explanations in the summary dashboard

6. **Improve error handling and edge cases**
   - Handle questions about topics not in the document gracefully
   - Handle ambiguous questions (ask for clarification via the agent)
   - Handle very large documents (50+ pages) — implement chunking batch processing
   - Add loading states for all async operations

**Deliverable:** Each uploaded document gets an auto-generated summary with coverage matrix and risk flags. Conversations handle follow-up questions correctly.

---

### WEEK 8: Polish, Testing & Deployment

**Goal:** Production-ready deployment on Vercel + Supabase with polished UI and documentation.

**Tasks:**

1. **UI polish**
   - Responsive design (works on mobile and desktop)
   - Dark/light mode toggle
   - Smooth animations for streaming messages
   - Empty states for no documents, no conversations
   - Onboarding flow: first-time user sees a quick guide
   - Loading skeletons for all data-fetching states

2. **Error handling and resilience**
   - Graceful Gemini API error handling (rate limits, outages)
   - Retry logic with exponential backoff for all external API calls
   - User-friendly error messages (not raw error dumps)
   - Fallback behavior when MCP servers are unreachable (agent should still work, just without those tools)

3. **Performance optimization**
   - Implement streaming properly end-to-end (ensure no buffering delays)
   - Optimize vector search: tune `lists` parameter in IVFFlat index based on data size
   - Lazy load conversation history
   - Optimize bundle size (dynamic imports for heavy components)

4. **Vercel deployment**
   - Push to GitHub, connect repo to Vercel
   - Configure environment variables in Vercel dashboard
   - Enable Fluid Compute for extended function duration
   - Set up Supabase connection pooling (use `?pgbouncer=true` in connection string for serverless)
   - Test the full flow end-to-end in production
   - Fix any environment-specific issues (connection timeouts, cold starts)

5. **MCP server deployment**
   - For production: the MCP servers need to be reachable from Vercel
   - Option A: Package MCP server logic directly into Next.js API routes (simplest — no separate deployment needed)
   - Option B: Deploy MCP servers as separate services on Railway or Render free tier
   - Option A is recommended for simplicity since you're the only user

6. **Testing**
   - Test with at least 3 different document types:
     - An auto insurance policy
     - A home/renter's insurance policy
     - A lease agreement
   - Test edge cases:
     - Very short document (1-2 pages)
     - Long document (50+ pages)
     - Document with many tables
     - Document with no tables
     - Questions that span multiple sections
     - Questions about content not in the document
     - Follow-up questions that reference previous answers
     - Cross-document comparison questions

7. **Documentation**
   - README.md with:
     - Project description and screenshots
     - Architecture diagram
     - Tech stack explanation
     - Setup instructions (local development)
     - Environment variables list
     - How to swap LLM providers
   - Inline code comments for complex logic (agent graph, chunking, table extraction)

8. **Demo preparation**
   - Prepare 2-3 sample documents for demos
   - Write a list of impressive demo questions that showcase:
     - Simple Q&A
     - Table value extraction
     - Multi-section reasoning
     - Term explanation with glossary
     - Cross-document comparison
     - Gap analysis

**Deliverable:** Fully deployed application on Vercel + Supabase. Clean UI, working end-to-end with real documents. README and documentation complete. Ready for portfolio.

---

### WEEK 9: Enhanced UX & Observability

**Goal:** Add quality-of-life features that improve usability, demo experience, and operational visibility.

**Tasks:**

1. **Export/download answers**
   - Add a "Copy as Markdown" button on each assistant message in the chat
   - Add a "Download" button on the document summary panel that exports the summary, risk flags, and gap analysis as a markdown file
   - Use the Clipboard API for copy, and `Blob` + `URL.createObjectURL` for download

2. **Document preview alongside chat** (`src/components/chat/DocumentPreview.tsx`)
   - When a citation `[Section: X, Page: Y]` is clicked, show the source chunk content in a slide-out side panel
   - Display the chunk text, section title, page number, and similarity score
   - Highlight the clicked citation in the panel
   - This avoids needing a full PDF renderer while still making citations actionable

3. **Global document search** (`src/app/api/search/route.ts`)
   - Add a search bar on the dashboard page
   - API endpoint accepts a query string and searches across all user's document chunks using vector similarity
   - Returns matching chunks grouped by document with snippets
   - Enables "which document covers X?" without selecting documents first

4. **Upload progress indicator**
   - Update the ingestion pipeline to report progress stages via a status field on the `documents` table
   - Stages: `parsing` → `chunking` → `embedding` → `ready` (or `error`)
   - Update the `upload_status` column to reflect the current stage instead of just `processing`
   - Poll the document status from the dashboard UI and show a step indicator
   - Show chunk count as it increases during embedding

5. **Conversation rename**
   - Add a PATCH endpoint to `/api/conversations/[id]` that updates the title
   - Add an edit/pencil icon next to conversation titles in the sidebar
   - Clicking it turns the title into an inline text input
   - Press Enter or blur to save, Escape to cancel

6. **Configurable chunk size** (`src/lib/ingestion/chunker.ts`)
   - Read `CHUNK_SIZE` and `CHUNK_OVERLAP` from environment variables with current defaults (1000 / 200)
   - Update `.env.example` with these optional vars
   - This allows tuning for different document types without code changes

7. **Token usage tracking**
   - Add a `token_usage` jsonb column to the `messages` table (or store in existing `tool_calls` metadata)
   - After each LLM call in the synthesize node, record prompt tokens and completion tokens
   - Display total token count per conversation in the conversation sidebar
   - Add a `token_count` field to the conversation list API response

**Deliverable:** Chat answers can be copied/exported, citations open a preview panel, documents are searchable from the dashboard, upload shows real progress, conversations can be renamed, chunking is tunable, and token usage is tracked per conversation.

---

## Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional — set to "true" to bypass auth in local development
DEV_AUTH_BYPASS=true

# Optional — model overrides
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Optional — upload limits
MAX_UPLOAD_SIZE_MB=10

# Optional — chunking tuning
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Optional — enables LlamaParse table extraction (falls back to Gemini heuristic)
LLAMA_PARSE_API_KEY=your_llamaparse_key

# Optional — enables web search tool in the agent
BRAVE_SEARCH_API_KEY=your_brave_api_key
```

## Model Swapping Guide

To switch from Gemini to another provider, only two files need to change:

**`src/lib/langchain/model.ts`:**

```typescript
// Current: Gemini
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
export const getLLM = () => new ChatGoogleGenerativeAI({ modelName: "gemini-2.5-flash" });

// To switch to Claude:
// import { ChatAnthropic } from "@langchain/anthropic";
// export const getLLM = () => new ChatAnthropic({ modelName: "claude-3-5-haiku-20241022" });

// To switch to OpenAI:
// import { ChatOpenAI } from "@langchain/openai";
// export const getLLM = () => new ChatOpenAI({ modelName: "gpt-4o-mini" });
```

**`src/lib/langchain/embeddings.ts`:**

```typescript
// Current: Gemini (768 dimensions)
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
export const getEmbeddings = () =>
  new GoogleGenerativeAIEmbeddings({ modelName: "text-embedding-004" });

// To switch to OpenAI (1536 dimensions — update vector column size in DB):
// import { OpenAIEmbeddings } from "@langchain/openai";
// export const getEmbeddings = () => new OpenAIEmbeddings({ modelName: "text-embedding-3-small" });
```

**Note:** If you switch embedding providers, you must re-embed all existing documents since different providers produce different vector spaces. Update the `vector(768)` column size in the database if the new provider uses a different dimension count.
