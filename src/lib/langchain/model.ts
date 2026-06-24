import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getFloatEnv, getNumberEnv, getRequiredEnv } from "@/lib/env";

interface LLMOptions {
  // Overrides the thinking budget. -1 = dynamic, 0 = disabled, >0 = capped.
  thinkingBudget?: number;
  // Overrides the model name.
  model?: string;
}

// One cached instance per (model, thinkingBudget) config.
const llmCache = new Map<string, ChatGoogleGenerativeAI>();

// Returns a cached Gemini chat model instance, keyed by config.
//
// Thinking budget for Gemini 2.5 Flash: -1 = dynamic (model default). Disabling
// it (0) cuts ~3-5s/query, but a hardened eval (votes=3, repeated runs) showed a
// real, consistent answer-relevancy cost on the agent's compare/synthesize paths
// — so those paths keep thinking on. Mechanical reformulation nodes use
// getFastLLM() instead (see below). Set LLM_THINKING_BUDGET to change the default.
export function getLLM(options?: LLMOptions) {
  const thinkingBudget = options?.thinkingBudget ?? getNumberEnv("LLM_THINKING_BUDGET", -1);
  const model = options?.model ?? (process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash");
  const cacheKey = `${model}:${thinkingBudget}`;

  let llm = llmCache.get(cacheKey);
  if (!llm) {
    console.info("[langchain] Initializing chat model", { model, thinkingBudget });
    llm = new ChatGoogleGenerativeAI({
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      model,
      temperature: getFloatEnv("LLM_TEMPERATURE", 0.2),
      thinkingConfig: { thinkingBudget },
    });
    llmCache.set(cacheKey, llm);
  }
  return llm;
}

// Returns a latency-optimised model for mechanical reformulation nodes (query
// rewrite, sub-query generation). Thinking is disabled here because these tasks
// don't benefit from it, and an optional faster model can be selected via
// GEMINI_FAST_MODEL (e.g. gemini-2.5-flash-lite). Quality-sensitive nodes
// (compare, synthesize) keep getLLM() with dynamic thinking.
export function getFastLLM() {
  return getLLM({
    thinkingBudget: 0,
    model: process.env.GEMINI_FAST_MODEL || undefined,
  });
}
