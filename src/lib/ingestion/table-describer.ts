import { getLLM } from "@/lib/langchain/model";
import type { DocumentChunkInput } from "@/lib/ingestion/types";

// Generate NL descriptions for table chunks to improve semantic search quality.
export async function generateTableDescriptions(
  chunks: DocumentChunkInput[],
): Promise<DocumentChunkInput[]> {
  const tableChunks = chunks.filter((c) => c.chunkType === "table");

  if (tableChunks.length === 0) return chunks;

  console.info("[ingestion] Generating table descriptions", {
    tableCount: tableChunks.length,
  });

  const llm = getLLM();

  const result: DocumentChunkInput[] = [];

  for (const chunk of chunks) {
    if (chunk.chunkType !== "table") {
      result.push(chunk);
      continue;
    }

    const tableMarkdown = (chunk.metadata.table_markdown as string) ?? chunk.content;
    const precedingContext = (chunk.metadata.preceding_context as string) ?? "";

    try {
      const response = await llm.invoke([
        {
          role: "system",
          content:
            "You are a legal document analyst. Given a markdown table from a legal document, write a 2-3 sentence natural language description that captures the key information in the table. Include the most important values and what they represent. Be specific and factual. Output only the description, nothing else.",
        },
        {
          role: "user",
          content: `Context before the table:\n${precedingContext}\n\nTable:\n${tableMarkdown}`,
        },
      ]);

      const description =
        typeof response.content === "string"
          ? response.content.trim()
          : String(response.content).trim();

      result.push({
        ...chunk,
        content: description,
      });
    } catch (error) {
      console.error("[ingestion] Table description generation failed, keeping markdown", error);
      result.push(chunk);
    }
  }

  console.info("[ingestion] Table descriptions generated");
  return result;
}
