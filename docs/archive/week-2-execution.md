# Week 2 Execution

## Objective

Add table-aware PDF processing to the ingestion pipeline so tables are extracted as atomic chunks, described in natural language for better semantic search, and documents are classified by legal type.

## In Scope

- W2-001 Extend ingestion types (ExtractedTable, wider chunkType)
- W2-002 Table extraction (LlamaParse primary, Gemini fallback)
- W2-003 Table-aware chunking (atomic table chunks, remove table regions from text)
- W2-004 Table NL description generation (Gemini)
- W2-005 Document type detection (Gemini classification)
- W2-006 Pipeline orchestration update (wire new steps)
- W2-007 Document detail GET API route
- W2-008 Upload API response extension
- W2-009 Dashboard UI updates (doc type badge, chunk/table counts, debug panel)

## Out of Scope

- Week 3 chat and citation UX
- Week 4 LangGraph agent workflows
- LlamaParse paid tier features beyond basic markdown extraction
- Database schema changes (existing schema already supports all new fields)

## Live Task Status

| Task ID | Status   | Note                                                                                                                                                       |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W2-001  | Complete | Added `ExtractedTable` interface; widened `chunkType` to `"text" \| "table" \| "heading" \| "list"`.                                                       |
| W2-002  | Complete | Dual-path table extractor: LlamaParse via REST API with polling, fallback to pattern detection + Gemini confirmation.                                      |
| W2-003  | Complete | Chunker accepts extracted tables, removes table regions from page text, inserts table chunks as atomic units with structured metadata.                     |
| W2-004  | Complete | Table describer generates 2-3 sentence NL descriptions via Gemini, replaces chunk content while preserving raw markdown in metadata.                       |
| W2-005  | Complete | Doc type detector classifies into insurance_policy, lease_agreement, employment_contract, nda, terms_of_service, or other.                                 |
| W2-006  | Complete | Pipeline wired: parsePdf → extractTables → chunkDocument → generateTableDescriptions → detectDocumentType → storeDocumentChunks.                           |
| W2-007  | Complete | GET `/api/documents/[id]` returns document + ordered chunks + aggregated chunk/table counts.                                                               |
| W2-008  | Complete | Upload response includes `documentType`, `chunkCount`, `tableCount`.                                                                                       |
| W2-009  | Complete | DocumentCard shows doc type badge and View Chunks toggle. ChunkDebugPanel lazy-loads chunks with type badges, page numbers, and expandable table markdown. |

## Session Log (Append-Only)

- 2026-03-26: Implemented all Week 2 tasks (W2-001 through W2-009). Build and typecheck pass.

## Handoff Snapshot

```text
Scope: Week 2, W2-001 to W2-009
Changes: Added table extractor (LlamaParse + Gemini fallback), table NL describer, doc type detector, table-aware chunker, updated pipeline, document detail API, extended upload response, dashboard debug UI
Acceptance criteria status: Partial - all code compiles and builds; table extraction and doc type detection depend on live Gemini API credentials; LlamaParse path requires LLAMA_PARSE_API_KEY
Risks/issues: Fallback table detection relies on heuristic pattern matching which may miss complex table layouts; LLM-generated descriptions quality depends on Gemini model performance
Next step: Test with real PDFs containing tables against live Supabase + Gemini to verify end-to-end table chunk storage and NL descriptions
```
