import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getFloatEnv, getNumberEnv, getRequiredEnv } from "@/lib/env";

let cachedLLM: ChatGoogleGenerativeAI | null = null;

// Returns a cached Gemini chat model instance (created once, reused across calls).
export function getLLM() {
  if (!cachedLLM) {
    console.info("[langchain] Initializing chat model");
    // Thinking budget for Gemini 2.5 Flash. -1 = dynamic (model default).
    // Disabling it (0) cut ~3-5s/query, but a hardened eval (votes=3, repeated
    // runs) showed a real, consistent answer-relevancy cost on the agent's
    // compare/synthesize paths — so we keep thinking on. Set LLM_THINKING_BUDGET=0
    // to trade that quality back for latency.
    const thinkingBudget = getNumberEnv("LLM_THINKING_BUDGET", -1);
    cachedLLM = new ChatGoogleGenerativeAI({
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
      temperature: getFloatEnv("LLM_TEMPERATURE", 0.2),
      thinkingConfig: { thinkingBudget },
    });
  }
  return cachedLLM;
}
