import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { getRequiredEnv } from "@/lib/env";

// This factory centralizes Gemini chat model configuration for the app.
export function getLLM() {
  console.info("[langchain] Initializing chat model");

  return new ChatGoogleGenerativeAI({
    apiKey: getRequiredEnv("GEMINI_API_KEY"),
    model: process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash",
    temperature: 0.2,
  });
}

