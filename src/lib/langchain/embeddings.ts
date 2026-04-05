import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { getRequiredEnv } from "@/lib/env";

// This factory centralizes Gemini embedding model configuration for retrieval.
export function getEmbeddings() {
  console.info("[langchain] Initializing embedding model");

  return new GoogleGenerativeAIEmbeddings({
    apiKey: getRequiredEnv("GEMINI_API_KEY"),
    model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
  });
}
