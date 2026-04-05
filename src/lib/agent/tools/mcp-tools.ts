// In-app implementations of MCP tool logic for the LangGraph agent.
// These mirror the MCP server tools but run directly in the Next.js process
// (Option A from the spec — simplest for single-user deployment).

import glossaryData from "../../../../mcp-servers/glossary-server/data/glossary.json";

interface GlossaryEntry {
  term: string;
  definition: string;
  category: string;
  relatedTerms: string[];
  examples: string[];
}

const glossary = glossaryData as GlossaryEntry[];

// Simple Levenshtein distance for fuzzy matching.
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[b.length][a.length];
}

export interface ToolResult {
  tool: string;
  input: Record<string, unknown>;
  output: string;
}

// Look up a legal/insurance term in the glossary with fuzzy matching.
export function lookupTerm(term: string): ToolResult {
  const normalized = term.toLowerCase().trim();

  // Exact match
  let entry = glossary.find((e) => e.term === normalized);

  // Substring match
  if (!entry) {
    entry = glossary.find((e) => e.term.includes(normalized) || normalized.includes(e.term));
  }

  // Fuzzy match (distance <= 2)
  if (!entry) {
    let best: GlossaryEntry | undefined;
    let bestDist = Infinity;
    for (const e of glossary) {
      const dist = levenshtein(normalized, e.term);
      if (dist < bestDist && dist <= 2) {
        bestDist = dist;
        best = e;
      }
    }
    entry = best;
  }

  if (!entry) {
    return {
      tool: "lookup_term",
      input: { term },
      output: `No glossary entry found for "${term}".`,
    };
  }

  const parts = [
    `**${entry.term}**: ${entry.definition}`,
    entry.relatedTerms.length > 0 ? `Related terms: ${entry.relatedTerms.join(", ")}` : "",
    entry.examples.length > 0 ? `Example: ${entry.examples[0]}` : "",
  ].filter(Boolean);

  return {
    tool: "lookup_term",
    input: { term },
    output: parts.join("\n"),
  };
}

// Search the web using Brave Search API.
export async function searchWeb(query: string, count = 5): Promise<ToolResult> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return {
      tool: "search_web",
      input: { query, count },
      output: "Web search is unavailable (BRAVE_SEARCH_API_KEY not configured).",
    };
  }

  try {
    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("count", String(Math.min(count, 10)));

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (!response.ok) {
      return {
        tool: "search_web",
        input: { query, count },
        output: `Web search failed with status ${response.status}.`,
      };
    }

    const data = (await response.json()) as {
      web?: { results?: Array<{ title: string; url: string; description: string }> };
    };

    const results = (data.web?.results ?? []).slice(0, count);
    const formatted = results
      .map((r, i) => `${i + 1}. **${r.title}**\n   ${r.description}\n   ${r.url}`)
      .join("\n\n");

    return {
      tool: "search_web",
      input: { query, count },
      output: formatted || "No search results found.",
    };
  } catch (error) {
    return {
      tool: "search_web",
      input: { query, count },
      output: `Web search failed: ${error instanceof Error ? error.message : "Unknown error"}.`,
    };
  }
}
