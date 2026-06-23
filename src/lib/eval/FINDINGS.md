# RAG Evaluation — Findings Log

Running log of what the eval harness has measured and the experiments run against it.
Numbers come from a 13-question golden set (3 simple-factual, 5 cross-document,
3 multi-section, 2 table-lookup) with reference answers verified against the source
documents. Judge: Gemini @ temp 0, claim-level faithfulness. Treat per-type deltas
as **directional** — n per type is small (≤5).

## Evaluator hardening (before any system change)

The first cut of the judge produced inverted scores: a confidently fabricated answer
scored faithfulness 1.0 while an honestly hedged answer scored 0.0. Fixes applied:

- **Claim-level faithfulness** — decompose the answer into atomic claims and score the
  fraction grounded in retrieved context (instead of one scalar 1–5). Honest "not in
  context" hedging no longer counts as unfaithful; fabrication does.
- **Completeness dimension** — explicitly scores whether a comparison answer covers
  every document/item asked. The old rubric scored "answered 1 of 3 documents" as 1.0.
- **Verified references** — original hand-written references were wrong (e.g. a product
  name guessed from marketing copy). Re-derived from the source documents.
- **Multi-vote** available via `EVAL_JUDGE_VOTES` (default 1; deterministic claim-level
  faithfulness makes 1 vote acceptable).

## Baseline — Agentic LangGraph vs Single-Shot RAG (current system)

Overall (n=13), agent vs baseline:

| Metric            | Agent | Baseline | Δ      |
| ----------------- | ----- | -------- | ------ |
| faithfulness      | 0.857 | 1.000    | -0.143 |
| answer relevancy  | 1.000 | 0.962    | +0.038 |
| context relevancy | 0.788 | 0.673    | +0.115 |
| completeness      | 0.846 | 0.673    | +0.173 |
| correctness       | 0.673 | 0.615    | +0.058 |

cross_document (n=5) — the category the agent is built for:

| Metric            | Agent | Baseline | Δ      |
| ----------------- | ----- | -------- | ------ |
| faithfulness      | 0.729 | 1.000    | -0.271 |
| context relevancy | 0.600 | 0.250    | +0.350 |
| completeness      | 0.600 | 0.250    | +0.350 |
| correctness       | 0.350 | 0.250    | +0.100 |

Reading: the agent meaningfully improves **completeness** and **context relevancy** on
complex cross-document queries (the baseline's global top-k returns chunks from mostly
one document). But **correctness is low for both** (0.35 / 0.25) and the agent trades
some **faithfulness** for completeness. The single-shot baseline is often "faithfully
incomplete" — grounded, but covering only one document.

## Experiment 1 — per-document retrieval quota (REVERTED)

- **Hypothesis:** a single global top-k starves non-dominant documents on multi-doc
  queries; retrieving top-k _per document_ should raise cross-document correctness.
- **Change:** `retrieve.ts` issued one scoped search per selected document (top-4 each)
  for multi-doc queries instead of one global top-5.
- **Result (cross_document, agent):** faithfulness +0.116 and context relevancy +0.100,
  but **answer relevancy −0.200 and correctness −0.150**. The proxy metrics improved
  while the outcome metric regressed.
- **Why it backfired** (from transcripts; retrieved chunk counts jumped to 20–33):
  1. **Cross-document contamination** — with every policy's chunks in one synthesis
     prompt, the model mis-attributed one policy's fact to another (a flat 30-day grace
     period was reported using a different policy's 15/30 monthly/other split).
  2. **Noise crowding** — generic brochure / plan-option chunks displaced the specific
     schedule chunk, yielding confident-but-wrong product names and terms.
- **Conclusion:** retrieval **volume** is not the bottleneck; **precision** is. Reverted.

## Open directions

1. **Retrieval precision for identity/schedule facts** — these chunks don't rank for
   semantic queries (a chunking/ingest issue); consider structured metadata extraction
   at ingest or hybrid keyword+vector search, not more chunks.
2. **Per-document synthesis isolation** — answer each document independently, then
   compose the comparison, so facts can't leak between documents.
3. **Larger golden set** (~10+ per type) and multi-vote for sturdier numbers.
