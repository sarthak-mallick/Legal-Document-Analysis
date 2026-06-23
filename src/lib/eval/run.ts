import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

import { buildAgentGraph } from "@/lib/agent/graph";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { singleShotRAG } from "@/lib/eval/baseline";
import { scoreAnswer } from "@/lib/eval/judges";
import { mean, retrievalMetrics, round } from "@/lib/eval/metrics";
import { withRetry } from "@/lib/eval/retry";
import { DATASET_PATH } from "@/lib/eval/generate-dataset";
import type {
  EvalQuestion,
  QuestionResult,
  RetrievedChunk,
  SystemRunResult,
} from "@/lib/eval/types";
import type { AgentStateType, DocumentMeta, QueryType } from "@/lib/agent/state";

const RESULTS_DIR = resolve(process.cwd(), "src/lib/eval/results");

type DocMetaMap = Map<string, DocumentMeta>;

// Load all document metadata referenced by the dataset (filename + type) so the
// agent gets the same context the chat route gives it.
async function loadDocumentMetas(questions: EvalQuestion[]): Promise<DocMetaMap> {
  const ids = [...new Set(questions.flatMap((q) => q.documentIds))];
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("documents")
    .select("id, filename, document_type")
    .in("id", ids);

  const map: DocMetaMap = new Map();
  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      filename: row.filename as string,
      documentType: (row.document_type as string) ?? null,
    });
  }
  return map;
}

// Run the full LangGraph agent for one question and collect its outputs.
async function runAgent(question: EvalQuestion, docMetas: DocMetaMap) {
  const agent = buildAgentGraph();
  const documentMetas = question.documentIds
    .map((id) => docMetas.get(id))
    .filter((m): m is DocumentMeta => Boolean(m));

  const finalState = (await agent.invoke({
    query: question.question,
    queryType: "simple_factual",
    documentIds: question.documentIds,
    documentMetas,
    conversationHistory: [],
  })) as AgentStateType;

  return {
    answer: finalState.response ?? "",
    retrievedChunks: (finalState.retrievedChunks ?? []) as RetrievedChunk[],
    queryType: (finalState.queryType ?? null) as QueryType | null,
  };
}

async function scoreSystem(
  question: EvalQuestion,
  answer: string,
  retrievedChunks: RetrievedChunk[],
): Promise<SystemRunResult> {
  const retrievedChunkIds = retrievedChunks.map((c) => c.id);
  const { hit, reciprocalRank } = retrievalMetrics(retrievedChunkIds, question.sourceChunkId);
  const judged = await withRetry(
    () =>
      scoreAnswer({
        question: question.question,
        answer,
        retrievedChunks,
        referenceAnswer: question.referenceAnswer,
      }),
    `judge:${question.id}`,
  );

  return { answer, retrievedChunkIds, hit, reciprocalRank, ...judged };
}

function aggregate(results: QuestionResult[], pick: (r: QuestionResult) => SystemRunResult) {
  const runs = results.map(pick);
  // Retrieval metrics only apply to questions with a single known-relevant chunk.
  // Cross-document / multi-section questions have no single gold chunk → null (n/a).
  const goldRuns = results.filter((r) => r.question.sourceChunkId).map(pick);
  return {
    hitRate: goldRuns.length ? round(mean(goldRuns.map((r) => (r.hit ? 1 : 0)))) : null,
    mrr: goldRuns.length ? round(mean(goldRuns.map((r) => r.reciprocalRank))) : null,
    faithfulness: round(mean(runs.map((r) => r.faithfulness))),
    answerRelevancy: round(mean(runs.map((r) => r.answerRelevancy))),
    contextRelevancy: round(mean(runs.map((r) => r.contextRelevancy))),
    completeness: round(mean(runs.map((r) => r.completeness))),
    correctness: round(mean(runs.map((r) => r.correctness))),
  };
}

type Aggregate = ReturnType<typeof aggregate>;

function fmtVal(v: number | null): string {
  return v === null ? "n/a" : v.toFixed(3);
}

function fmtDelta(a: number | null, b: number | null): string {
  if (a === null || b === null) return "n/a";
  const delta = round(a - b);
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(3)}`;
}

function formatTable(agent: Aggregate, baseline: Aggregate): string {
  const rows: Array<[string, number | null, number | null]> = [
    ["hit-rate@k", agent.hitRate, baseline.hitRate],
    ["MRR", agent.mrr, baseline.mrr],
    ["faithfulness", agent.faithfulness, baseline.faithfulness],
    ["answer relevancy", agent.answerRelevancy, baseline.answerRelevancy],
    ["context relevancy", agent.contextRelevancy, baseline.contextRelevancy],
    ["completeness", agent.completeness, baseline.completeness],
    ["correctness", agent.correctness, baseline.correctness],
  ];
  const lines = [
    "| Metric            | Agent | Baseline | Δ     |",
    "| ----------------- | ----- | -------- | ----- |",
    ...rows.map(
      ([name, a, b]) =>
        `| ${name.padEnd(17)} | ${fmtVal(a).padEnd(5)} | ${fmtVal(b).padEnd(8)} | ${fmtDelta(a, b).padEnd(5)} |`,
    ),
  ];
  return lines.join("\n");
}

// Orchestrates the full evaluation: agent vs single-shot baseline over the golden
// set, scored on retrieval + LLM-judge metrics, with a per-query-type breakdown.
export async function runEval() {
  const questions = JSON.parse(readFileSync(DATASET_PATH, "utf8")) as EvalQuestion[];
  const docMetas = await loadDocumentMetas(questions);

  const results: QuestionResult[] = [];

  let skipped = 0;
  for (const [i, question] of questions.entries()) {
    console.info(`[eval] (${i + 1}/${questions.length}) ${question.question}`);

    // Run agent and baseline (sequential to stay within API rate limits).
    // One question failing after retries is logged and skipped, not fatal.
    try {
      const agentRun = await withRetry(() => runAgent(question, docMetas), `agent:${question.id}`);
      const baselineRun = await withRetry(
        () => singleShotRAG(question.question, question.documentIds),
        `baseline:${question.id}`,
      );

      const agent = await scoreSystem(question, agentRun.answer, agentRun.retrievedChunks);
      const baseline = await scoreSystem(question, baselineRun.answer, baselineRun.retrievedChunks);

      results.push({ question, agentQueryType: agentRun.queryType, agent, baseline });
    } catch (err) {
      skipped++;
      console.error(`[eval] Skipping ${question.id} after retries: ${(err as Error).message}`);
    }
  }

  if (results.length === 0) {
    throw new Error("All questions failed — likely an API outage. Try again later.");
  }
  if (skipped > 0) {
    console.warn(`[eval] ${skipped} question(s) skipped due to persistent errors.`);
  }

  const agentAgg = aggregate(results, (r) => r.agent);
  const baselineAgg = aggregate(results, (r) => r.baseline);

  // Per-query-type breakdown (using the agent's own classification)
  const byType: Record<string, { agent: Aggregate; baseline: Aggregate; count: number }> = {};
  const types = [...new Set(results.map((r) => r.agentQueryType ?? "unknown"))];
  for (const type of types) {
    const subset = results.filter((r) => (r.agentQueryType ?? "unknown") === type);
    byType[type] = {
      count: subset.length,
      agent: aggregate(subset, (r) => r.agent),
      baseline: aggregate(subset, (r) => r.baseline),
    };
  }

  const table = formatTable(agentAgg, baselineAgg);
  console.info(`\n=== Agent vs Single-Shot Baseline (n=${results.length}) ===\n${table}\n`);

  // Persist machine-readable results and a human-readable markdown report
  mkdirSync(RESULTS_DIR, { recursive: true });
  const stamp = new Date().toISOString();
  writeFileSync(
    resolve(RESULTS_DIR, "latest.json"),
    JSON.stringify({ stamp, n: results.length, agentAgg, baselineAgg, byType, results }, null, 2),
    "utf8",
  );

  const typeSection = Object.entries(byType)
    .map(([type, d]) => `### ${type} (n=${d.count})\n\n${formatTable(d.agent, d.baseline)}\n`)
    .join("\n");

  const report = `# RAG Evaluation Report

Generated: ${stamp}
Questions: ${results.length}
Metrics: hit-rate@k & MRR (retrieval, vs source chunk); faithfulness, answer/context relevancy (reference-free LLM-judge); correctness (vs reference answer). Judge: Gemini @ temp 0.

## Overall: Agentic LangGraph vs Single-Shot RAG

${table}

## By Query Type

${typeSection}
`;
  writeFileSync(resolve(RESULTS_DIR, "report.md"), report, "utf8");
  console.info(`[eval] Wrote results to ${RESULTS_DIR}/latest.json and report.md`);

  return { agentAgg, baselineAgg, byType, results };
}
