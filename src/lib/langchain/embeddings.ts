import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";

import { getRequiredEnv } from "@/lib/env";

let cachedModel: GenerativeModel | null = null;

function getEmbeddingModel() {
  if (!cachedModel) {
    console.info("[langchain] Initializing embedding model");
    const apiKey = getRequiredEnv("GEMINI_API_KEY");
    const modelName = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
    cachedModel = new GoogleGenerativeAI(apiKey).getGenerativeModel(
      { model: modelName },
      { apiVersion: "v1beta" },
    );
  }
  return cachedModel;
}

// Embed a list of texts using the Gemini embedding API directly.
// The LangChain GoogleGenerativeAIEmbeddings wrapper defaults to apiVersion
// "v1beta" which returns 404 for text-embedding-004.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getEmbeddingModel();
  const response = await client.batchEmbedContents({
    requests: texts.map((text) => ({
      content: { role: "user" as const, parts: [{ text }] },
      outputDimensionality: 768,
    })),
  });

  return response.embeddings.map((e) => e.values ?? []);
}

// Bounded cache for query embeddings — avoids redundant API calls during retrieval retries.
const queryCache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 50;

// Embed a single query string (used for search/retrieval).
export async function embedQuery(text: string): Promise<number[]> {
  const cached = queryCache.get(text);
  if (cached) return cached;

  const client = getEmbeddingModel();
  const response = await client.embedContent({
    content: { role: "user" as const, parts: [{ text }] },
    outputDimensionality: 768,
  } as Parameters<typeof client.embedContent>[0]);

  const embedding = response.embedding.values ?? [];

  if (queryCache.size >= MAX_CACHE_SIZE) {
    queryCache.delete(queryCache.keys().next().value!);
  }
  queryCache.set(text, embedding);

  return embedding;
}
