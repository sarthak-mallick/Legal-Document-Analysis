import { getLLM } from "@/lib/langchain/model";
import { SYSTEM_PROMPT } from "@/lib/agent/prompts/system";
import { buildSynthesisPrompt } from "@/lib/agent/prompts/synthesis";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";
import type { Citation } from "@/types/conversation";

// Parse citation references from the response text.
function extractCitations(
  text: string,
  chunks: { id: string; section_title: string | null; page_number: number | null; content: string }[],
): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  const pattern = /\[Section:\s*([^,\]]+),\s*Page:\s*(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const sectionRef = match[1].trim();
    const pageRef = parseInt(match[2], 10);

    const matchingChunk = chunks.find(
      (c) =>
        (c.section_title?.toLowerCase().includes(sectionRef.toLowerCase()) ||
          sectionRef.toLowerCase().includes(c.section_title?.toLowerCase() ?? "")) &&
        c.page_number === pageRef,
    ) ?? chunks.find((c) => c.page_number === pageRef);

    if (matchingChunk && !seen.has(matchingChunk.id)) {
      seen.add(matchingChunk.id);
      citations.push({
        chunk_id: matchingChunk.id,
        section_title: matchingChunk.section_title,
        page_number: matchingChunk.page_number,
        snippet: matchingChunk.content.slice(0, 200),
      });
    }
  }

  for (const chunk of chunks) {
    if (!seen.has(chunk.id)) {
      seen.add(chunk.id);
      citations.push({
        chunk_id: chunk.id,
        section_title: chunk.section_title,
        page_number: chunk.page_number,
        snippet: chunk.content.slice(0, 200),
      });
    }
  }

  return citations;
}

// Generate the final answer with citations from all gathered context.
export async function synthesize(state: AgentStateType): Promise<AgentUpdateType> {
  console.info("[agent:synthesize] Generating response", {
    chunkCount: state.retrievedChunks.length,
    hasTableData: !!state.tableData,
    toolResultCount: state.toolResults?.length ?? 0,
  });

  const llm = getLLM();

  // Build the synthesis prompt with all context including tool results
  let prompt = buildSynthesisPrompt(
    state.query,
    state.retrievedChunks,
    state.conversationHistory,
    state.toolResults ?? [],
  );

  // Append table query result if available
  if (state.tableData) {
    prompt += `\n\n## Table Query Result\nExtracted value for "${state.tableData.question}": ${state.tableData.answer}`;
  }

  const response = await llm.invoke([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ]);

  const content = typeof response.content === "string"
    ? response.content
    : String(response.content);

  const citations = extractCitations(content, state.retrievedChunks);

  console.info("[agent:synthesize] Response generated", {
    responseLength: content.length,
    citationCount: citations.length,
  });

  return {
    response: content,
    citations,
    nodesVisited: ["synthesize"],
  };
}
