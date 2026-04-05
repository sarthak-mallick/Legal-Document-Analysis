# Week 7 Execution

## Objective

Add auto-generated document summaries with risk flagging and gap analysis, plus a document detail page for viewing analysis results.

## In Scope

- W7-001 Summary generation API (structured summary, risk flags, gap analysis)
- W7-002 Coverage checklists per document type
- W7-003 CoverageSummary UI component (summary + risk flag cards)
- W7-004 GapAnalysis UI component (coverage matrix)
- W7-005 DocumentSummaryPanel orchestrator
- W7-006 Document detail page (/dashboard/[documentId])
- W7-007 DocumentCard links to detail page
- W7-008 API types for summary response

## Out of Scope

- Week 8 polish and deployment
- Background summary generation after upload (summary is on-demand via button)
- Conversation memory pagination (existing last-10 approach retained)
- Clickable source section side panel in summary

## Live Task Status

| Task ID | Status   | Note                                                                                                                                                                    |
| ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W7-001  | Complete | POST `/api/summary/[documentId]` generates summary, risk flags, and gap analysis via 3 Gemini calls. Stores summary in documents.summary. GET returns existing summary. |
| W7-002  | Complete | Checklists for insurance_policy (10 items), lease_agreement (10), employment_contract (10), nda (8), terms_of_service (8).                                              |
| W7-003  | Complete | CoverageSummary renders markdown summary with severity-colored risk flag cards (high=rose, medium=amber, low=blue).                                                     |
| W7-004  | Complete | GapAnalysis shows coverage matrix grid with covered (green), partial (amber), not_covered (red) dots and counts.                                                        |
| W7-005  | Complete | DocumentSummaryPanel handles generate/regenerate state, error display, and composes CoverageSummary + GapAnalysis.                                                      |
| W7-006  | Complete | `/dashboard/[documentId]` page shows document metadata, summary panel, and collapsible chunk viewer.                                                                    |
| W7-007  | Complete | DocumentCard filename is now a link to the detail page. Summary text updated to prompt user to click.                                                                   |
| W7-008  | Complete | Added SummaryResponse type to api.ts with riskFlags and gapAnalysis shapes.                                                                                             |

## Session Log (Append-Only)

- 2026-03-26: Implemented all Week 7 tasks (W7-001 through W7-008). Build and typecheck pass.

## Handoff Snapshot

```text
Scope: Week 7, W7-001 to W7-008
Changes: Added summary generation API with risk flags and gap analysis, coverage checklists per doc type, CoverageSummary/GapAnalysis/DocumentSummaryPanel components, document detail page, DocumentCard link to detail
Acceptance criteria status: Partial - all code compiles and builds; summary generation makes 3 Gemini calls per document (summary, risk, gap) so requires live API; risk flags and gap analysis quality depend on Gemini's analysis capability
Risks/issues: Summary generation is synchronous and may be slow for large documents (30+ chunks); gap analysis depends on document type being correctly detected; no caching of risk flags/gap analysis (only summary is persisted)
Next step: Week 8 (polish, testing, deployment) or test summary generation with real documents
```
