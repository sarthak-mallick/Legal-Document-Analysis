import { getLLM } from "@/lib/langchain/model";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";

// Build a side-by-side context for cross-document comparison.
export async function compare(state: AgentStateType): Promise<AgentUpdateType> {
  console.info("[agent:compare] Building cross-document comparison", {
    documentCount: state.documentMetas.length,
    chunkCount: state.retrievedChunks.length,
  });

  const llm = getLLM();

  // Group chunks by document
  const chunksByDoc = new Map<string, typeof state.retrievedChunks>();
  for (const chunk of state.retrievedChunks) {
    const existing = chunksByDoc.get(chunk.document_id) ?? [];
    existing.push(chunk);
    chunksByDoc.set(chunk.document_id, existing);
  }

  // Build side-by-side context
  const sections: string[] = [];
  for (const [docId, chunks] of chunksByDoc) {
    const meta = state.documentMetas.find((d) => d.id === docId);
    const docName = meta?.filename ?? "Unknown document";
    const docType = meta?.documentType ?? "unknown";

    const chunkText = chunks
      .map((c) => {
        const section = c.section_title ?? "Unknown section";
        const page = c.page_number ?? "?";
        return `  [${section}, Page ${page}]: ${c.content.slice(0, 300)}`;
      })
      .join("\n\n");

    sections.push(`### ${docName} (${docType})\n${chunkText}`);
  }

  const comparisonContext = sections.join("\n\n---\n\n");

  try {
    const response = await llm.invoke([
      {
        role: "system",
        content: `You are a legal document comparison assistant. Given sections from multiple documents and a question, build a structured comparison highlighting similarities, differences, and any gaps. Format your output as a comparison summary that the synthesis node can use.`,
      },
      {
        role: "user",
        content: `Question: ${state.query}\n\nDocument sections:\n${comparisonContext}`,
      },
    ]);

    const comparison = typeof response.content === "string"
      ? response.content
      : String(response.content);

    console.info("[agent:compare] Comparison generated", {
      length: comparison.length,
    });

    // Store the comparison as a refined query hint for synthesis
    return {
      refinedQuery: comparison,
      nodesVisited: ["compare"],
    };
  } catch (error) {
    console.error("[agent:compare] Comparison failed", error);
    return {
      nodesVisited: ["compare"],
    };
  }
}
