# ADR-0001: Custom ingestion and retrieval layer, not LangChain abstractions

**Status:** Accepted
**Date:** 2026-06-30

## Context

LangChain is a dependency of this project, but only three packages are actually used:
`@langchain/google-genai` (LLM client), `@langchain/langgraph` (agent graph), and
`@langchain/core` (message primitives). The document loading, representation, chunking,
embedding, and retrieval layers are all hand-rolled.

That divergence from "the LangChain way" is deliberate and easy to mistake for an
oversight, so it is recorded here. Two of the migrations behind it have their own
entries in `docs/challenges.md` (the `pdf-parse`/`pdfjs-dist` Next.js 16 incompatibility
and the silent-empty-vector bug in `GoogleGenerativeAIEmbeddings`).

## Decision

Use LangChain only for LLM/embedding client configuration and LangGraph agent
orchestration. Hand-roll everything in the document pipeline:

| Layer                   | LangChain option not used                    | What we use instead                                                                                                                                                                              |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PDF loading             | `PDFLoader` (wraps `pdf-parse`/`pdfjs-dist`) | `unpdf`, `extractText(..., { mergePages: false })` → one entry per page. See `src/lib/ingestion/pdf-parser.ts`.                                                                                  |
| Document representation | `Document` (`{ pageContent, metadata }`)     | Custom `ParsedDocument` / `DocumentChunkInput` with page-aware blocks and table interleaving. See `src/lib/ingestion/types.ts`.                                                                  |
| Chunking                | `RecursiveCharacterTextSplitter`             | Table-aware chunker: interleaves LlamaParse tables (described via Gemini) with prose, carries section titles forward, tags each chunk with its page. See `src/lib/ingestion/chunker.ts`.         |
| Embeddings              | `GoogleGenerativeAIEmbeddings`               | Direct `@google/generative-ai` SDK: `batchEmbedContents`/`embedContent` with `apiVersion: "v1beta"`, `gemini-embedding-001`, `outputDimensionality: 768`. See `src/lib/langchain/embeddings.ts`. |
| Retrieval               | `SupabaseVectorStore`                        | Direct pgvector RPC: `matchDocumentChunks` calls the `match_chunks` Postgres function. See `src/lib/langchain/vectorstore.ts`.                                                                   |

## Consequences

**Why each replacement was needed:**

- `PDFLoader` broke under Next.js 16 Turbopack (`DataCloneError` in the fake-worker
  `structuredClone` path) and, on `pdf-parse` v1, returned the whole document as a
  single page. Page numbers are essential for citations.
- LangChain's flat document shape would obscure the page-aware blocks and table
  interleaving the pipeline depends on.
- A generic character splitter has no notion of tables, section titles, or pages.
- `GoogleGenerativeAIEmbeddings` swallowed API errors via `Promise.allSettled`
  (returning empty vectors **silently**) and did not expose `apiVersion` or
  `outputDimensionality`.
- Calling the RPC directly gives explicit control over the similarity function,
  `filter_document_ids` metadata filtering, and match counts — with one fewer
  abstraction between the agent and the SQL.

**Costs accepted:** more code to maintain, and no drop-in swap to another vector store
or loader. Changing the embedding provider means touching `embeddings.ts` **and** the
`vector(768)` column size.

**Where LangChain still earns its place:** LLM/embedding client config and the
LangGraph agent in `src/lib/agent/`, where the abstraction adds real leverage.

Used selectively, LangChain is a net win. Adopted wholesale, it would have fought the
requirements: page-aware citations, table-aware chunking, serverless portability, loud
failures, and precise SQL.
