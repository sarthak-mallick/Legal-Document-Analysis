# ADR-0004: Heuristic query routing, and keep Gemini "thinking" on

**Status:** Accepted
**Date:** 2026-04-14, revised 2026-06-22

## Context

Every chat message originally required 3–4 sequential Gemini calls minimum
(classify → evaluate → synthesize), and 7+ in the worst case (cross-document with
sub-query expansion and three evaluation retries). At ~1–3s per round-trip, users waited
3–20s before seeing a single streamed token.

Neither of the two cheapest calls genuinely needed an LLM: query classification is
choosing a route label, and context evaluation is judging sufficiency from similarity
scores already attached to the retrieved chunks. Separately, follow-up questions like
"What about the exclusions?" hit retrieval with zero conversation context, producing poor
results that triggered evaluation retries — compounding the latency.

## Decision

**1. Route with heuristics, not LLM calls.**

- `classify-query.ts` uses regex patterns for `cross_document`, `term_explanation`,
  `table_lookup`, `multi_section`, and `general`, falling back to `simple_factual`. The
  function is synchronous — zero latency.
- `evaluate-context.ts` scores three tiers from similarity alone: high-confidence
  (2+ chunks ≥ 0.8), medium-confidence (1+ chunks ≥ 0.4), and low-confidence retry with
  a query simplified by stripping question words. The retry loop and max-attempts logic
  are preserved; no LLM call at any tier.

**2. Spend one LLM call on history-aware query rewriting instead.**
`rewrite-query.ts` runs at the head of the graph. On follow-ups it rewrites the query as
self-contained ("What about the exclusions?" → "What are the exclusions in my insurance
policy?"); first messages pass through without an LLM call. Retrieval resolves
`refinedQuery ?? rewrittenQuery ?? query`, so rewrites and retries compose. The original
`state.query` is preserved for the synthesis prompt.

Graph flow: `START → rewriteQuery → classifyQuery → retrieve → evaluateContext → synthesize → END`.

**3. Keep Gemini 2.5 Flash "thinking" enabled** (`LLM_THINKING_BUDGET=-1`, dynamic).

**4. Bound the remaining latency without touching quality:** cap
`MAX_RETRIEVAL_ATTEMPTS` at 2 (was 3), and skip sub-query regeneration on retries
(retries reuse the simplified query, so regenerating added a round-trip for no gain).

## Consequences

LLM calls per question:

| Scenario                                   | Before | After |
| ------------------------------------------ | ------ | ----- |
| First question (simple, high-confidence)   | 2–3    | 1     |
| First question (low-confidence, 2 retries) | 4–5    | 1     |
| Follow-up                                  | 3–4    | 2     |
| Cross-document comparison                  | 5–7    | 2–3   |

**Trade-offs accepted:**

- Heuristic classification occasionally misroutes novel phrasings. Impact is limited:
  a misroute to `simple_factual` still retrieves and synthesizes, just without sub-query
  expansion or tool calls.
- Heuristic evaluation is less nuanced than an LLM judge, but the 0.4 similarity
  threshold already filters irrelevant chunks and the synthesis prompt says explicitly
  when context is insufficient. The retry loop catches the zero-chunk case.
- Query rewriting adds a call to follow-ups, offset by better retrieval and fewer retries.

## On the thinking budget: a reversal worth recording

Disabling thinking (`thinkingBudget: 0`) was measured as the single largest latency win —
cross-document 10,148ms → 6,840ms (−33%), multi-section 9,450ms → 4,185ms (−56%). It was
shipped, then **reverted**.

An initial budget sweep (off / 512 / dynamic) on single runs suggested the off-vs-dynamic
quality gap was within noise. Single runs proved far too noisy — cross-document
correctness swung 0.05 ↔ 0.80 between identical-config runs. Re-run hardened
(`EVAL_JUDGE_VOTES=3`, 2 full runs per setting, min–max ranges), the result **overturned**
that conclusion: thinking-off carries a real, consistent answer-relevancy cost
(overall 0.82 vs 0.93; cross-document 0.60 vs 0.81, ranges not overlapping).

So thinking stays on, at ~3–5s/query. Set `LLM_THINKING_BUDGET=0` to trade that
measured relevancy for the latency.

**Lessons carried forward:**

- Don't trust a single eval run. Only votes=3 plus repeated runs separated signal
  (answer relevancy) from noise (correctness).
- Full-eval wall-clock is not a latency metric — with concurrent execution it is
  dominated by Gemini rate-limit (503) retry backoff. The isolated per-query benchmark is
  the trustworthy signal.
- The same hardened run showed the agent does **not** reliably beat the single-shot
  baseline on cross-document correctness. An earlier small-sample claim to the contrary
  did not survive repetition.
