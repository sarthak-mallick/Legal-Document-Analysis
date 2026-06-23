import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getFloatEnv, getNumberEnv, getRequiredEnv } from "@/lib/env";

let cachedLLM: ChatGoogleGenerativeAI | null = null;

// Returns a cached Gemini chat model instance (created once, reused across calls).
export function getLLM() {
  if (!cachedLLM) {
    console.info("[langchain] Initializing chat model");
    // Gemini 2.5 Flash enables "thinking" by default, which adds seconds of
    // latency to every call. The agent makes several sequential calls per query,
    // so we disable it (thinkingBudget 0) for a large latency win. Override via
    // LLM_THINKING_BUDGET if a task ever needs reasoning tokens.
    const thinkingBudget = getNumberEnv("LLM_THINKING_BUDGET", 0);
    cachedLLM = new ChatGoogleGenerativeAI({
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
      temperature: getFloatEnv("LLM_TEMPERATURE", 0.2),
      thinkingConfig: { thinkingBudget },
    });
  }
  return cachedLLM;
}
