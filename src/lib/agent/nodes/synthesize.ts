import { getLLM } from "@/lib/langchain/model";
import { buildSystemPrompt } from "@/lib/agent/prompts/system";
import { buildSynthesisPrompt } from "@/lib/agent/prompts/synthesis";
import type { AgentStateType, AgentUpdateType } from "@/lib/agent/state";
import type { Citation } from "@/types/conversation";

// Parse citation references from the response text.
// Supports both footnote-style [1] with a Sources list, and inline [Section: ..., Page: ...] format.
function extractCitations(
  text: string,
  chunks: {
    id: string;
    section_title: string | null;
    page_number: number | null;
    content: string;
  }[],
): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  function findChunk(sectionRef: string, pageRef: number) {
    return (
      chunks.find(
        (c) =>
          (c.section_title?.toLowerCase().includes(sectionRef.toLowerCase()) ||
            sectionRef.toLowerCase().includes(c.section_title?.toLowerCase() ?? "")) &&
          c.page_number === pageRef,
      ) ?? chunks.find((c) => c.page_number === pageRef)
    );
  }

  function makeSnippet(content: string): string {
    // Collapse line breaks and excess whitespace
    const collapsed = content
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Extract sentences that look like real prose (start with capital, 7+ words, end with period)
    const sentences = collapsed.match(/[A-Z][^.!?]*(?:[.!?](?:\s|$))/g) ?? [];
    const prose = sentences.find((s) => s.split(/\s+/).length >= 7);

    if (!prose) return "";

    return prose.length > 200 ? prose.slice(0, 200).replace(/\s+\S*$/, "") + "…" : prose.trim();
  }

  function addChunk(chunk: (typeof chunks)[0] | undefined) {
    if (chunk && !seen.has(chunk.id)) {
      seen.add(chunk.id);
      citations.push({
        chunk_id: chunk.id,
        section_title: chunk.section_title,
        page_number: chunk.page_number,
        snippet: makeSnippet(chunk.content),
      });
    }
  }

  // Try footnote-style sources list: [1] Section: ..., Page: ... or [1] Document: ..., Section: ..., Page: ...
  const footnotePattern =
    /\[(\d+)\]\s*(?:Document:\s*[^,]+,\s*)?Section:\s*([^,\]]+),\s*Page:\s*(\d+)/g;
  let match: RegExpExecArray | null;

  while ((match = footnotePattern.exec(text)) !== null) {
    addChunk(findChunk(match[2].trim(), parseInt(match[3], 10)));
  }

  // Fallback: try inline [Section: ..., Page: ...] format
  if (citations.length === 0) {
    const inlinePattern = /\[Section:\s*([^,\]]+),\s*Page:\s*(\d+)\]/g;
    while ((match = inlinePattern.exec(text)) !== null) {
      addChunk(findChunk(match[1].trim(), parseInt(match[2], 10)));
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

  // Build adaptive system prompt based on document types
  const docTypes = (state.documentMetas ?? [])
    .map((d) => d.documentType)
    .filter((t): t is string => !!t);
  const systemPrompt = buildSystemPrompt(docTypes);

  // The compare node stores its analysis in refinedQuery
  const comparisonContext = state.queryType === "cross_document" ? state.refinedQuery : null;

  // Build the synthesis prompt with all context including tool results
  let prompt = buildSynthesisPrompt(
    state.query,
    state.retrievedChunks,
    state.conversationHistory,
    state.toolResults ?? [],
    state.documentMetas ?? [],
    comparisonContext,
  );

  // Append table query result if available
  if (state.tableData) {
    prompt += `\n\n## Table Query Result\nExtracted value for "${state.tableData.question}": ${state.tableData.answer}`;
  }

  const response = await llm.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ]);

  const content =
    typeof response.content === "string" ? response.content : String(response.content);

  const citations = extractCitations(content, state.retrievedChunks);

  // Strip the "Sources:" list from the displayed response — the citation cards handle this.
  const displayContent = content
    .replace(/\n*\*{0,2}Sources:?\*{0,2}\n(\[\d+\][^\n]*\n?)+/i, "")
    .trimEnd();

  // Extract token usage from LLM response metadata
  const usage = response.usage_metadata;
  const tokenUsage = {
    promptTokens: usage?.input_tokens ?? 0,
    completionTokens: usage?.output_tokens ?? 0,
  };

  console.info("[agent:synthesize] Response generated", {
    responseLength: content.length,
    citationCount: citations.length,
    tokenUsage,
  });

  return {
    response: displayContent,
    citations,
    tokenUsage,
    nodesVisited: ["synthesize"],
  };
}
