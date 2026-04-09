import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getFloatEnv, getRequiredEnv } from "@/lib/env";

let cachedLLM: ChatGoogleGenerativeAI | null = null;

// Returns a cached Gemini chat model instance (created once, reused across calls).
export function getLLM() {
  if (!cachedLLM) {
    console.info("[langchain] Initializing chat model");
    cachedLLM = new ChatGoogleGenerativeAI({
      apiKey: getRequiredEnv("GEMINI_API_KEY"),
      model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
      temperature: getFloatEnv("LLM_TEMPERATURE", 0.2),
    });
  }
  return cachedLLM;
}
