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

> ⚠️ These are single-run numbers and did NOT hold up under repeated measurement.
> Experiment 3 (votes=3, 2 runs/setting) shows the baseline actually beats the agent on
> cross-document **correctness**. Treat this baseline table as illustrative, not settled.

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

## Evaluator fix — tool evidence in the faithfulness context

The faithfulness judge originally saw only retrieved document chunks, so claims the
agent sourced from its glossary/web tools were scored as hallucinations. Fixed by
passing the agent's tool outputs into the judge's context (external evidence only —
not the agent's own intermediate LLM output, which would let hallucinations launder
themselves). Effect: term_explanation faithfulness 0.750 → 0.833, overall agent
faithfulness 0.857 → 0.939. The remaining gap to the baseline's 1.0 is mostly the
baseline being "trivially faithful" (it answers from a narrow single-document context).

## Experiment 2 — agent latency

- **Root cause:** latency is dominated by sequential Gemini generation calls, NOT
  vector search. Isolated per-query timing: the non-LLM portion (embeddings + pgvector
  - DB) is only ~0.5-1s; the rest is LLM round-trips. The biggest single factor was
    Gemini 2.5 Flash's default "thinking".
- **Changes:** disable thinking (`thinkingConfig.thinkingBudget: 0`, env
  `LLM_THINKING_BUDGET`); cap `MAX_RETRIEVAL_ATTEMPTS` 3 → 2; skip sub-query
  regeneration on retrieval retries; run eval questions with bounded concurrency
  (`EVAL_CONCURRENCY`, default 3).
- **Per-query latency (isolated benchmark):** thinking off vs dynamic —
  cross_document 6.8s vs 10.1s (−33%), multi_section 4.2s vs 9.5s (−56%),
  simple_factual unchanged (~1.3s, one minimal call).
- **Thinking-budget quality sweep (agent overall, n=13):** dynamic was marginally best
  on every metric (correctness 0.596, faithfulness 0.856), thinking-off close behind
  (0.558 / 0.843), and **budget 512 was worst on every metric** — partial thinking is
  not a sweet spot. At single-run resolution the off-vs-dynamic gap looked like noise —
  but a hardened re-measurement (Experiment 3) overturned that, so the kept settings are
  the latency-free wins (retry-cap, sub-query-skip, eval concurrency) with thinking left
  ON. See Experiment 3.
- **Caveat:** full-eval wall-clock is NOT a reliable speed metric here — with
  concurrency it's dominated by rate-limit (503) retry backoff, so runs vary by luck.
  Trust the isolated per-query benchmark instead.

## Experiment 3 — hardened thinking comparison (off vs dynamic)

The single-run thinking comparison was too noisy to trust (cross_document correctness
swung 0.05 ↔ 0.80 between identical-config runs). Re-ran with `EVAL_JUDGE_VOTES=3` and
**2 full runs per setting**, reporting min–max ranges:

| Metric (agent)             | OFF       | DYNAMIC   | verdict                               |
| -------------------------- | --------- | --------- | ------------------------------------- |
| overall answer relevancy   | 0.81–0.83 | 0.92–0.94 | dynamic better, **real** (no overlap) |
| overall faithfulness       | 0.81–0.87 | 0.87–0.93 | dynamic mildly better                 |
| overall completeness       | 0.69–0.70 | 0.72–0.78 | dynamic mildly better                 |
| overall correctness        | 0.52–0.56 | 0.55–0.60 | tied                                  |
| cross-doc answer relevancy | 0.58–0.62 | 0.80–0.83 | dynamic better, **real** (big gap)    |
| cross-doc correctness      | 0.07–0.12 | 0.07–0.15 | tied, both near floor                 |

**Two corrections to earlier claims:**

1. **Thinking-off has a real quality cost** — answer relevancy separates cleanly
   (overall 0.82 vs 0.93; cross-doc 0.60 vs 0.81, ranges don't touch). The earlier
   "within noise" conclusion was an artifact of single noisy runs. **Decision: revert to
   dynamic thinking** (`LLM_THINKING_BUDGET=-1`), keeping the latency-free wins. Set
   `LLM_THINKING_BUDGET=0` to trade ~3-5s/query back for that quality.
2. **The agent does NOT reliably beat the single-shot baseline.** Across all 4 runs the
   baseline scored higher cross-document **correctness** (off: agent 0.07–0.12 vs base
   0.53–0.57; dynamic: agent 0.07–0.15 vs base 0.43–0.58). The agent's broad multi-doc
   attempt introduces more wrong facts (retrieval-precision/contamination), while the
   baseline's narrower answer is more often correct. The agent's measured edge is answer
   relevancy + completeness under dynamic thinking — not correctness. The earlier
   "agent wins cross-document" was a small-sample artifact.

## Open directions

1. **Retrieval precision for identity/schedule facts** — these chunks don't rank for
   semantic queries (a chunking/ingest issue); consider structured metadata extraction
   at ingest or hybrid keyword+vector search, not more chunks.
2. **Per-document synthesis isolation** — answer each document independently, then
   compose the comparison, so facts can't leak between documents.
3. **Larger golden set** (~10+ per type) and multi-vote for sturdier numbers.
