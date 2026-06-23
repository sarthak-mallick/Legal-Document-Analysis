# RAG Evaluation Harness

All-TypeScript eval that compares the full **LangGraph agent** against a **single-shot
RAG baseline** over a synthesized golden Q/A set. No new runtime dependencies — it
runs through a dedicated Vitest config and reuses the app's Gemini + Supabase clients.

## Prerequisites

- At least one document ingested (rows in `document_chunks`).
- `.env.local` populated (`GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`) — loaded automatically by `setup-env.ts`.

## Usage

```bash
# 1. Build a golden set from your own documents (LLM-synthesized Q/A + source-chunk labels)
npm run eval:gen        # writes src/lib/eval/dataset.json

# 2. (Optional) Hand-curate dataset.json — fix wording, correct reference answers,
#    add hard cross-document questions with documentIds: [docA, docB].

# 3. Run the evaluation
npm run eval            # prints a comparison table; writes results/latest.json + report.md
```

## What it measures

| Metric            | Type      | Needs reference? | Meaning                                                                    |
| ----------------- | --------- | ---------------- | -------------------------------------------------------------------------- |
| hit-rate@k        | retrieval | source chunk     | was the known-relevant chunk retrieved                                     |
| MRR               | retrieval | source chunk     | how highly the source chunk was ranked                                     |
| faithfulness      | LLM-judge | no               | are the answer's claims grounded in retrieved context (anti-hallucination) |
| answer relevancy  | LLM-judge | no               | does the answer address the question                                       |
| context relevancy | LLM-judge | no               | was the retrieved context relevant/sufficient                              |
| correctness       | LLM-judge | yes (draft ref)  | does the answer agree with the reference answer                            |

Results are broken down **by query type** (the agent's own classification) so you can
say which complex query categories the agent improves over naive RAG.

## How the "no reference answers" problem is handled

The generator derives each question from one real chunk, so:

- the **source chunk** is a free ground-truth label for retrieval metrics, and
- Gemini drafts a **reference answer** you can quickly hand-correct.

The three faithfulness/relevancy metrics are **reference-free**, so the agent-vs-baseline
comparison is valid even before you curate a single reference answer.

## Files

- `generate-dataset.ts` — sample chunks → synthesize Q/A → `dataset.json`
- `baseline.ts` — single-shot RAG control (embed → top-k → one LLM call)
- `judges.ts` — Gemini-as-judge (temp 0), all four scores in one call
- `metrics.ts` — retrieval metrics + aggregation helpers
- `run.ts` — orchestrates agent vs baseline, aggregates, writes report
- `*.eval.ts` — thin Vitest wrappers (entry points for the npm scripts)
