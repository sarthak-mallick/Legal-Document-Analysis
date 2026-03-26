import type { ToolResult } from "@/lib/agent/tools/mcp-tools";
import type { MessageRecord, RetrievedChunk } from "@/types/conversation";

// Format retrieved chunks into context for the synthesis prompt.
function formatChunkContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No relevant document sections were found for this question.";
  }

  return chunks
    .map((chunk, i) => {
      const section = chunk.section_title ? `Section: ${chunk.section_title}` : "Section: Unknown";
      const page = chunk.page_number ? `Page: ${chunk.page_number}` : "Page: Unknown";
      const type = chunk.chunk_type === "table" ? " [TABLE]" : "";

      let content = chunk.content;
      // For table chunks, also include the raw markdown if available
      if (chunk.chunk_type === "table" && chunk.metadata?.table_markdown) {
        content += `\n\nTable data:\n${chunk.metadata.table_markdown}`;
      }

      return `--- Source ${i + 1} (${section}, ${page})${type} ---\n${content}`;
    })
    .join("\n\n");
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

  return toolResults
    .map((r) => `--- ${r.tool} ---\n${r.output}`)
    .join("\n\n");
}

// Build the full synthesis prompt with retrieved context, tool results, and conversation history.
export function buildSynthesisPrompt(
  query: string,
  chunks: RetrievedChunk[],
  history: MessageRecord[],
  toolResults: ToolResult[] = [],
): string {
  const parts: string[] = [];

  if (history.length > 0) {
    parts.push(`## Conversation History\n${formatHistory(history)}`);
  }

  parts.push(`## Retrieved Document Context\n${formatChunkContext(chunks)}`);

  if (toolResults.length > 0) {
    parts.push(`## External Tool Results\n${formatToolResults(toolResults)}`);
  }

  const instructions = [
    "1. Cite your sources using [Section: <title>, Page: <number>] format.",
    "2. If the context does not contain enough information to fully answer, say so explicitly.",
    "3. For table data, reference specific values from the table.",
    "4. Keep your answer focused and relevant to the question.",
  ];

  if (toolResults.length > 0) {
    instructions.push(
      "5. Clearly distinguish between information from the document and information from external sources (glossary, web search).",
    );
  }

  parts.push(`## Instructions\nAnswer the user's question based on the context provided above.\n${instructions.join("\n")}`);

  parts.push(`## User Question\n${query}`);

  return parts.join("\n\n");
}
