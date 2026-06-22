import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getRequiredEnv } from "@/lib/env";
import type { JudgeScores, RetrievedChunk } from "@/lib/eval/types";

let cachedJudge: ChatGoogleGenerativeAI | null = null;

// A dedicated temperature-0 judge model for deterministic scoring (separate from
// the temperature-0.2 app model so grading is as stable as possible).
function getJudge() {
  if (!cachedJudge) {
    cachedJudge = new ChatGoogleGenerativeAI({
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
      temperature: 0,
    });
  }
  return cachedJudge;
}

const MAX_CONTEXT_CHARS = 1200;

// Map a 1–5 Likert rating to 0..1.
function normalize(score: number): number {
  const clamped = Math.max(1, Math.min(5, score));
  return (clamped - 1) / 4;
}

function parseJson(raw: string): Record<string, number> {
  const cleaned = raw
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: pull the first {...} block out
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

// LLM-as-judge. Three reference-free metrics (faithfulness, answer relevancy,
// context relevancy) plus a reference-based correctness score — all in one call
// to conserve API quota.
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

  const prompt = `You are a strict evaluator of a legal-document question-answering system.
Rate the ANSWER on each dimension below using an integer from 1 (poor) to 5 (excellent).

QUESTION:
${params.question}

RETRIEVED CONTEXT:
${context}

ANSWER:
${params.answer}

REFERENCE ANSWER (ground truth):
${params.referenceAnswer}

Dimensions:
- faithfulness: Is every claim in the ANSWER supported by the RETRIEVED CONTEXT? Penalize unsupported claims (hallucination). If the answer correctly says info is not found and the context indeed lacks it, score high.
- answerRelevancy: Does the ANSWER directly and completely address the QUESTION?
- contextRelevancy: Is the RETRIEVED CONTEXT relevant and sufficient for answering the QUESTION?
- correctness: Does the ANSWER agree with the REFERENCE ANSWER on the facts?

Respond with ONLY a JSON object, no prose:
{"faithfulness": <1-5>, "answerRelevancy": <1-5>, "contextRelevancy": <1-5>, "correctness": <1-5>}`;

  const response = await getJudge().invoke(prompt);
  const raw = typeof response.content === "string" ? response.content : String(response.content);
  const parsed = parseJson(raw);

  return {
    faithfulness: normalize(parsed.faithfulness ?? 1),
    answerRelevancy: normalize(parsed.answerRelevancy ?? 1),
    contextRelevancy: normalize(parsed.contextRelevancy ?? 1),
    correctness: normalize(parsed.correctness ?? 1),
  };
}
