interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
}

const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

export async function searchWeb(query: string, count: number = 5): Promise<string> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return JSON.stringify({
      error: true,
      message: "BRAVE_SEARCH_API_KEY is not configured. Web search is unavailable.",
    });
  }

  try {
    const url = new URL(BRAVE_API_URL);
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
      return JSON.stringify({
        error: true,
        message: `Brave Search API returned status ${response.status}`,
      });
    }

    const data = (await response.json()) as BraveSearchResponse;
    const results: SearchResult[] = (data.web?.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description,
    }));

    return JSON.stringify({ results, count: results.length });
  } catch (error) {
    return JSON.stringify({
      error: true,
      message: `Web search failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

export async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LegalDocAnalyzer/1.0 (research assistant)",
      },
    });

    if (!response.ok) {
      return JSON.stringify({
        error: true,
        message: `Failed to fetch page: HTTP ${response.status}`,
      });
    }

    const html = await response.text();

    // Simple HTML to text extraction: remove tags and excess whitespace
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000); // Limit to ~5000 chars

    return JSON.stringify({ url, content: text, truncated: html.length > 5000 });
  } catch (error) {
    return JSON.stringify({
      error: true,
      message: `Failed to fetch page: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
