import type { DocumentMeta } from "@/lib/agent/state";
import type { ToolResult } from "@/lib/agent/tools/mcp-tools";
import type { MessageRecord, RetrievedChunk } from "@/types/conversation";

// Format retrieved chunks into context, grouped by document for multi-doc queries.
function formatChunkContext(
  chunks: RetrievedChunk[],
  documentMetas: DocumentMeta[],
  isMultiDoc: boolean,
): string {
  if (chunks.length === 0) {
    return "No relevant document sections were found for this question.";
  }

  if (!isMultiDoc) {
    return chunks
      .map((chunk, i) => {
        const section = chunk.section_title
          ? `Section: ${chunk.section_title}`
          : "Section: Unknown";
        const page = chunk.page_number ? `Page: ${chunk.page_number}` : "Page: Unknown";
        const type = chunk.chunk_type === "table" ? " [TABLE]" : "";

        let content = chunk.content;
        if (chunk.chunk_type === "table" && chunk.metadata?.table_markdown) {
          content += `\n\nTable data:\n${chunk.metadata.table_markdown}`;
        }

        return `--- Source ${i + 1} (${section}, ${page})${type} ---\n${content}`;
      })
      .join("\n\n");
  }

  // Multi-document: group by document
  const byDoc = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const existing = byDoc.get(chunk.document_id) ?? [];
    existing.push(chunk);
    byDoc.set(chunk.document_id, existing);
  }

  const sections: string[] = [];
  let sourceIdx = 1;

  for (const [docId, docChunks] of byDoc) {
    const meta = documentMetas.find((d) => d.id === docId);
    const docName = meta?.filename ?? "Unknown document";

    const chunkTexts = docChunks.map((chunk) => {
      const section = chunk.section_title ? `Section: ${chunk.section_title}` : "Section: Unknown";
      const page = chunk.page_number ? `Page: ${chunk.page_number}` : "Page: Unknown";
      const type = chunk.chunk_type === "table" ? " [TABLE]" : "";

      let content = chunk.content;
      if (chunk.chunk_type === "table" && chunk.metadata?.table_markdown) {
        content += `\n\nTable data:\n${chunk.metadata.table_markdown}`;
      }

      return `  --- Source ${sourceIdx++} (${section}, ${page})${type} ---\n  ${content}`;
    });

    sections.push(`### Document: ${docName}\n${chunkTexts.join("\n\n")}`);
  }

  return sections.join("\n\n---\n\n");
}

// Format conversation history for context.
function formatHistory(messages: MessageRecord[]): string {
  if (messages.length === 0) return "";

  return messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

// Format tool results for the synthesis prompt.
function formatToolResults(toolResults: ToolResult[]): string {
  if (toolResults.length === 0) return "";

  return toolResults.map((r) => `--- ${r.tool} ---\n${r.output}`).join("\n\n");
}

// Build the full synthesis prompt with retrieved context, tool results, and conversation history.
export function buildSynthesisPrompt(
  query: string,
  chunks: RetrievedChunk[],
  history: MessageRecord[],
  toolResults: ToolResult[] = [],
  documentMetas: DocumentMeta[] = [],
  comparisonContext: string | null = null,
): string {
  const isMultiDoc = documentMetas.length > 1;
  const parts: string[] = [];

  if (history.length > 0) {
    parts.push(`## Conversation History\n${formatHistory(history)}`);
  }

  parts.push(
    `## Retrieved Document Context\n${formatChunkContext(chunks, documentMetas, isMultiDoc)}`,
  );

  if (comparisonContext) {
    parts.push(`## Cross-Document Comparison Analysis\n${comparisonContext}`);
  }

  if (toolResults.length > 0) {
    parts.push(`## External Tool Results\n${formatToolResults(toolResults)}`);
  }

  const instructions = isMultiDoc
    ? [
        "1. Use numbered footnotes [1], [2], etc. to cite sources. At the end, list each source: [1] Document: <name>, Section: <title>, Page: <number>.",
        "2. Reuse the same footnote number when citing the same source. Do not repeat citations on every line.",
        "3. Clearly label which information comes from which document.",
        "4. If the context does not contain enough information to fully answer, say so explicitly.",
        "5. For comparison questions, organize your answer by topic, not by document.",
        "6. For table data, reference specific values from the table.",
      ]
    : [
        "1. Use numbered footnotes [1], [2], etc. to cite sources. At the end, list each source: [1] Section: <title>, Page: <number>.",
        "2. Reuse the same footnote number when citing the same source. Do not repeat citations on every line.",
        "3. If the context does not contain enough information to fully answer, say so explicitly.",
        "4. For table data, reference specific values from the table.",
        "5. Keep your answer focused and relevant to the question.",
      ];

  if (toolResults.length > 0) {
    instructions.push(
      `${instructions.length + 1}. Clearly distinguish between information from the document and information from external sources (glossary, web search).`,
    );
  }

  parts.push(
    `## Instructions\nAnswer the user's question based on the context provided above.\n${instructions.join("\n")}`,
  );

  parts.push(`## User Question\n${query}`);

  return parts.join("\n\n");
}
