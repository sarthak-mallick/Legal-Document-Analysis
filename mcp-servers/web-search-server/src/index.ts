import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { searchWeb, fetchPageContent } from "./tools.js";

const server = new McpServer({
  name: "web-search-server",
  version: "1.0.0",
});

server.tool(
  "search_web",
  "Search the web using Brave Search. Useful for finding benchmarks, regulations, or general context about legal and insurance topics.",
  {
    query: z.string().describe("The search query"),
    count: z.number().optional().default(5).describe("Number of results to return (max 10)"),
  },
  async (args) => ({
    content: [{ type: "text" as const, text: await searchWeb(args.query, args.count) }],
  }),
);

server.tool(
  "fetch_page_content",
  "Fetch and extract text content from a web page URL. Useful for getting details from a search result.",
  {
    url: z.string().url().describe("The URL to fetch content from"),
  },
  async (args) => ({
    content: [{ type: "text" as const, text: await fetchPageContent(args.url) }],
  }),
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[web-search-server] Running on stdio");
}

main().catch(console.error);
