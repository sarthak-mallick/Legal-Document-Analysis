import { getLLM } from "@/lib/langchain/model";
import type { AgentStateType, AgentUpdateType, TableQueryResult } from "@/lib/agent/state";

// Extract specific values from structured table data in retrieved chunks.
export async function queryTable(state: AgentStateType): Promise<AgentUpdateType> {
  const tableChunks = state.retrievedChunks.filter((c) => c.chunk_type === "table");

  if (tableChunks.length === 0) {
    return { nodesVisited: ["queryTable"] };
  }

  console.info("[agent:queryTable] Querying table data", {
    tableCount: tableChunks.length,
  });

  const llm = getLLM();

  // Use the first table chunk with structured data
  for (const chunk of tableChunks) {
    const tableData = chunk.metadata?.table_data as
      | { headers: string[]; rows: string[][] }
      | undefined;

    if (!tableData) continue;

    try {
      const response = await llm.invoke([
        {
          role: "system",
          content:
            "Given a table and a question, extract the specific value(s) that answer the question. Be precise and quote exact values. If the table doesn't contain the answer, say NOT_FOUND. Output only the answer, nothing else.",
        },
        {
          role: "user",
          content: `Table headers: ${tableData.headers.join(" | ")}\nTable rows:\n${tableData.rows.map((r) => r.join(" | ")).join("\n")}\n\nQuestion: ${state.query}`,
        },
      ]);

      const answer =
        typeof response.content === "string"
          ? response.content.trim()
          : String(response.content).trim();

      if (answer !== "NOT_FOUND") {
        const result: TableQueryResult = {
          question: state.query,
          answer,
          sourceChunkId: chunk.id,
        };

        console.info("[agent:queryTable] Table query result", { answer: answer.slice(0, 100) });

        return {
          tableData: result,
          nodesVisited: ["queryTable"],
        };
      }
    } catch (error) {
      console.error("[agent:queryTable] Table query failed for chunk", error);
    }
  }

  return { nodesVisited: ["queryTable"] };
}
