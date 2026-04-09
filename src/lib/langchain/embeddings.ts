import { GoogleGenerativeAI } from "@google/generative-ai";

import { getRequiredEnv } from "@/lib/env";

const model = () => {
  const apiKey = getRequiredEnv("GEMINI_API_KEY");
  const modelName = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

  return new GoogleGenerativeAI(apiKey).getGenerativeModel(
    { model: modelName },
    { apiVersion: "v1beta" },
  );
};

// Embed a list of texts using the Gemini embedding API directly.
// The LangChain GoogleGenerativeAIEmbeddings wrapper defaults to apiVersion
// "v1beta" which returns 404 for text-embedding-004.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  console.info("[langchain] Initializing embedding model");

  const client = model();
  const response = await client.batchEmbedContents({
    requests: texts.map((text) => ({
      content: { role: "user" as const, parts: [{ text }] },
      outputDimensionality: 768,
    })),
  });

  return response.embeddings.map((e) => e.values ?? []);
}

// Embed a single query string (used for search/retrieval).
export async function embedQuery(text: string): Promise<number[]> {
  const client = model();
  const response = await client.embedContent({
    content: { role: "user" as const, parts: [{ text }] },
    outputDimensionality: 768,
  });

  return response.embedding.values ?? [];
}
