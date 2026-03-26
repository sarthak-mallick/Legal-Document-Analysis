import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { handleLookupTerm, handleListTermsByCategory } from "./tools.js";

const server = new McpServer({
  name: "glossary-server",
  version: "1.0.0",
});

server.tool(
  "lookup_term",
  "Look up a legal or insurance term in the glossary. Supports fuzzy matching for misspellings.",
  { term: z.string().describe("The legal or insurance term to look up") },
  async (args) => ({
    content: [{ type: "text" as const, text: handleLookupTerm(args) }],
  }),
);

server.tool(
  "list_terms_by_category",
  "List all glossary terms in a given category. Categories include: general, liability, property, auto, employment, health.",
  { category: z.string().describe("The category to list terms for (e.g., 'liability', 'auto', 'property')") },
  async (args) => ({
    content: [{ type: "text" as const, text: handleListTermsByCategory(args) }],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[glossary-server] Running on stdio");
}

main().catch(console.error);
