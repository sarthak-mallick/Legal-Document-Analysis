# Week 6 Execution

## Objective

Enable multi-document support with cross-document comparison queries, adaptive analysis profiles per document type, and improved dashboard management.

## In Scope

- W6-001 Adaptive system prompts per document type
- W6-002 Document metadata in agent state
- W6-003 Cross-document comparison node
- W6-004 Updated graph routing for compare flow
- W6-005 Multi-document synthesis with per-document citation format
- W6-006 Improved query classification for comparison questions
- W6-007 Chat API passes document metadata to agent
- W6-008 Dashboard document selection with checkboxes
- W6-009 Batch delete functionality

## Out of Scope

- Week 7 auto-generated summaries and gap analysis
- Week 8 polish and deployment
- Document grid view (kept list layout, added selection)
- Cross-document table comparison

## Live Task Status

| Task ID | Status   | Note                                                                                                                                                                                                                                                 |
| ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W6-001  | Complete | `buildSystemPrompt()` appends document-type-specific focus areas (insurance: coverage/exclusions/deductibles; lease: rent/obligations/termination; employment: compensation/non-compete; NDA: confidentiality/duration; ToS: liability/arbitration). |
| W6-002  | Complete | `DocumentMeta` interface added to agent state with id, filename, documentType. Populated from documents table in chat API.                                                                                                                           |
| W6-003  | Complete | `compare` node groups chunks by document, builds side-by-side context, uses Gemini to generate structured comparison analysis.                                                                                                                       |
| W6-004  | Complete | Graph routes `cross_document` queries (when multiple docs) through compare → synthesize. All other flows unchanged.                                                                                                                                  |
| W6-005  | Complete | Synthesis prompt groups chunks by document with headers. Multi-doc uses `[Document: X, Section: Y, Page: Z]` citation format. Single-doc unchanged.                                                                                                  |
| W6-006  | Complete | Classification prompt expanded with comparison-detection examples ("compare", "difference between", "which document/policy").                                                                                                                        |
| W6-007  | Complete | Chat API fetches document records to build documentMetas array passed to agent invocation.                                                                                                                                                           |
| W6-008  | Complete | DocumentCard supports checkbox selection with ring highlight. DocumentList passes selection state.                                                                                                                                                   |
| W6-009  | Complete | UploadDashboard shows batch delete bar with count, delete, and clear selection when documents are selected.                                                                                                                                          |

## Session Log (Append-Only)

- 2026-03-26: Implemented all Week 6 tasks (W6-001 through W6-009). Build and typecheck pass.

## Handoff Snapshot

```text
Scope: Week 6, W6-001 to W6-009
Changes: Adaptive system prompts per doc type, DocumentMeta in agent state, compare node for cross-doc queries, multi-doc synthesis with per-doc grouping and citation format, improved classification prompt, document selection and batch delete in dashboard
Acceptance criteria status: Partial - all code compiles and builds; cross-document comparison depends on having multiple documents uploaded with chunks; adaptive prompts require document_type to be populated
Risks/issues: Compare node makes an additional LLM call per cross-document query; comparison quality depends on having relevant chunks from each document; batch delete is sequential (not parallel)
Next step: Week 7 (summaries, gap analysis, conversation memory) or test cross-document flow with multiple real documents
```
