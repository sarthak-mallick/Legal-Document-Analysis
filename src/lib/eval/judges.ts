import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getRequiredEnv } from "@/lib/env";
import { mean } from "@/lib/eval/metrics";
import type { JudgeScores, RetrievedChunk } from "@/lib/eval/types";

// Number of independent judge passes to average (majority-style smoothing).
// Default 1 to conserve quota; set EVAL_JUDGE_VOTES=3 for trustworthy final runs.
const JUDGE_VOTES = Math.max(1, Number(process.env.EVAL_JUDGE_VOTES ?? 1));
const MAX_CONTEXT_CHARS = 1200;

let cachedJudge: ChatGoogleGenerativeAI | null = null;

// Dedicated judge model. With a single vote we use temperature 0 (deterministic);
// with multiple votes we add a little temperature so the passes actually differ.
function getJudge() {
  if (!cachedJudge) {
    cachedJudge = new ChatGoogleGenerativeAI({
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
      temperature: JUDGE_VOTES > 1 ? 0.3 : 0,
    });
  }
  return cachedJudge;
}

// Map a 1–5 Likert rating to 0..1.
function normalize(score: number): number {
  const clamped = Math.max(1, Math.min(5, Number(score) || 1));
  return (clamped - 1) / 4;
}

function parseJson(raw: string): Record<string, unknown> {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}

interface ClaimVerdict {
  claim: string;
  supported: boolean;
}

// Faithfulness via claim decomposition: fraction of the answer's atomic factual
// claims that are grounded in the retrieved context. An answer that correctly
// hedges ("not stated in the context") has no unsupported claims → 1.0; an answer
// that fabricates facts → low. This is what fixes the earlier inverted scores.
function faithfulnessFromClaims(parsed: Record<string, unknown>): number {
  const claims = Array.isArray(parsed.claims) ? (parsed.claims as ClaimVerdict[]) : [];
  const factual = claims.filter((c) => c && typeof c.supported === "boolean");
  if (factual.length === 0) return 1; // nothing asserted (or pure hedging) is not unfaithful
  const supported = factual.filter((c) => c.supported).length;
  return supported / factual.length;
}

const PROMPT = (p: {
  question: string;
  answer: string;
  context: string;
  referenceAnswer: string;
}) => `You are a strict evaluator of a legal-document question-answering system.

QUESTION:
${p.question}

RETRIEVED CONTEXT:
${p.context}

ANSWER:
${p.answer}

REFERENCE ANSWER (ground truth):
${p.referenceAnswer}

Step 1 — Faithfulness via claim decomposition.
Break the ANSWER into atomic factual claims about the documents. For EACH claim decide whether it is directly supported by the RETRIEVED CONTEXT.
- Judge support ONLY against the RETRIEVED CONTEXT — never use outside knowledge.
- A claim that information "is not found / not stated in the context" is supported=true when the context indeed lacks it.
- Ignore non-factual filler (greetings, restating the question, formatting).

Step 2 — Rate each dimension from 1 (poor) to 5 (excellent):
- answerRelevancy: does the ANSWER directly address the QUESTION (on-topic)?
- contextRelevancy: is the RETRIEVED CONTEXT relevant and sufficient to answer the QUESTION?
- completeness: does the ANSWER cover EVERY part the QUESTION asks for? For a comparison across multiple documents/items, an answer that addresses only some of them must score low (e.g. 2 of 3 documents covered ≈ 2-3, only 1 of 3 ≈ 1).
- correctness: are the facts stated in the ANSWER correct according to the REFERENCE ANSWER?

Respond with ONLY this JSON (no prose):
{"claims":[{"claim":"<text>","supported":true}],"answerRelevancy":<1-5>,"contextRelevancy":<1-5>,"completeness":<1-5>,"correctness":<1-5>}`;

async function judgeOnce(params: {
  question: string;
  answer: string;
  context: string;
  referenceAnswer: string;
}): Promise<JudgeScores> {
  const response = await getJudge().invoke(PROMPT(params));
  const raw = typeof response.content === "string" ? response.content : String(response.content);
  const parsed = parseJson(raw);

  return {
    faithfulness: faithfulnessFromClaims(parsed),
    answerRelevancy: normalize(parsed.answerRelevancy as number),
    contextRelevancy: normalize(parsed.contextRelevancy as number),
    completeness: normalize(parsed.completeness as number),
    correctness: normalize(parsed.correctness as number),
  };
}

// LLM-as-judge: claim-level faithfulness + reference-free relevancy + reference-based
// correctness, averaged over EVAL_JUDGE_VOTES independent passes.
export async function scoreAnswer(params: {
  question: string;
  answer: string;
  retrievedChunks: RetrievedChunk[];
  referenceAnswer: string;
}): Promise<JudgeScores> {
  const context =
    params.retrievedChunks
      .map((c, i) => `[${i + 1}] ${c.content.slice(0, MAX_CONTEXT_CHARS)}`)
      .join("\n\n") || "(no context retrieved)";

  const judgeParams = {
    question: params.question,
    answer: params.answer,
    context,
    referenceAnswer: params.referenceAnswer,
  };

  const votes: JudgeScores[] = [];
  for (let i = 0; i < JUDGE_VOTES; i++) {
    votes.push(await judgeOnce(judgeParams));
  }

  return {
    faithfulness: mean(votes.map((v) => v.faithfulness)),
    answerRelevancy: mean(votes.map((v) => v.answerRelevancy)),
    contextRelevancy: mean(votes.map((v) => v.contextRelevancy)),
    completeness: mean(votes.map((v) => v.completeness)),
    correctness: mean(votes.map((v) => v.correctness)),
  };
}
