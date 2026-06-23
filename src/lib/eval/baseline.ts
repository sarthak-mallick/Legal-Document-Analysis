import { getLLM } from "@/lib/langchain/model";
import { matchDocumentChunks } from "@/lib/langchain/vectorstore";
import { getNumberEnv } from "@/lib/env";
import type { RetrievedChunk } from "@/types/conversation";

const BASELINE_TOP_K = getNumberEnv("RETRIEVAL_TOP_K", 5);
const MAX_CONTEXT_CHARS = 1500;

// Single-shot RAG baseline: embed → top-k vector search → ONE LLM call.
// This is the "naive RAG" control we compare the full LangGraph agent against.
export async function singleShotRAG(
  query: string,
  documentIds: string[],
): Promise<{ answer: string; retrievedChunks: RetrievedChunk[] }> {
  const retrievedChunks = (await matchDocumentChunks(query, {
    documentIds: documentIds.length > 0 ? documentIds : undefined,
    matchCount: BASELINE_TOP_K,
  })) as RetrievedChunk[];

  const context = retrievedChunks
    .map((chunk, i) => {
      const header = `[Source ${i + 1}] Section: ${chunk.section_title ?? "n/a"}, Page: ${
        chunk.page_number ?? "n/a"
      }`;
      return `${header}\n${chunk.content.slice(0, MAX_CONTEXT_CHARS)}`;
    })
    .join("\n\n");

  const llm = getLLM();
  const response = await llm.invoke([
    {
      role: "system",
      content:
        "You are a legal document assistant. Answer the question using ONLY the provided context. " +
        "Cite sources with numbered footnotes like [1]. " +
        "If the context does not contain the answer, say you could not find it rather than guessing.",
    },
    {
      role: "user",
      content: `Context:\n${context || "(no context retrieved)"}\n\nQuestion: ${query}`,
    },
  ]);

  const answer = typeof response.content === "string" ? response.content : String(response.content);

  return { answer: answer.trim(), retrievedChunks };
}
