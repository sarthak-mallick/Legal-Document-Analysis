import { getLLM } from "@/lib/langchain/model";
import type { ExtractedTable, ParsedDocument } from "@/lib/ingestion/types";

const LLAMA_PARSE_URL = "https://api.cloud.llamaindex.ai/api/parsing";

interface LlamaParseJob {
  id: string;
  status: string;
}

interface LlamaParseResult {
  markdown: string;
}

// Poll interval and max attempts for LlamaParse async jobs.
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Parse markdown table text into headers and row arrays.
function parseMarkdownTable(markdown: string): {
  headers: string[];
  rows: string[][];
} {
  const lines = markdown
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const headers: string[] = [];
  const rows: string[][] = [];

  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    // Skip separator rows like |---|---|
    if (cells.every((c) => /^[-:]+$/.test(c))) continue;

    if (headers.length === 0) {
      headers.push(...cells);
    } else {
      rows.push(cells);
    }
  }

  return { headers, rows };
}

// Extract tables from LlamaParse markdown output.
function extractTablesFromMarkdown(
  markdown: string,
  parsedDocument: ParsedDocument,
): ExtractedTable[] {
  const tables: ExtractedTable[] = [];
  // Match markdown tables: header row, separator, data rows
  const tableRegex = /(\|[^\n]+\|\n\|[-| :]+\|\n(?:\|[^\n]+\|\n?)+)/g;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(markdown)) !== null) {
    const tableMarkdown = match[1].trim();
    const { headers, rows } = parseMarkdownTable(tableMarkdown);

    if (headers.length === 0) continue;

    // Try to find which page this table belongs to by matching header content
    let pageNumber = 1;
    let precedingContext = "";
    let sectionTitle: string | null = null;

    for (const page of parsedDocument.pages) {
      if (headers.some((h) => page.text.includes(h))) {
        pageNumber = page.pageNumber;
        // Get ~200 chars of text before any header match
        const headerIndex = page.text.indexOf(headers[0]);
        if (headerIndex > 0) {
          precedingContext = page.text.slice(Math.max(0, headerIndex - 200), headerIndex).trim();
        }
        break;
      }
    }

    // Try to detect section title from preceding context
    const contextLines = precedingContext.split("\n").filter(Boolean);
    for (let i = contextLines.length - 1; i >= 0; i--) {
      const line = contextLines[i].trim();
      if (
        /^[A-Z][A-Z\s\d\-&,]{5,}$/.test(line) ||
        /^\d+(\.\d+)*\s+[A-Z]/.test(line) ||
        /^section\s+\d+/i.test(line)
      ) {
        sectionTitle = line;
        break;
      }
    }

    tables.push({
      markdown: tableMarkdown,
      headers,
      rows,
      rawText: tableMarkdown,
      pageNumber,
      precedingContext,
      sectionTitle,
    });
  }

  return tables;
}

// Primary path: use LlamaParse cloud API.
async function extractTablesWithLlamaParse(
  buffer: Buffer,
  parsedDocument: ParsedDocument,
): Promise<ExtractedTable[]> {
  const apiKey = process.env.LLAMA_PARSE_API_KEY;
  if (!apiKey) return [];

  console.info("[ingestion] Using LlamaParse for table extraction");

  const formData = new FormData();
  formData.append("file", new Blob([new Uint8Array(buffer)], { type: "application/pdf" }), "document.pdf");
  formData.append("result_type", "markdown");

  const uploadResponse = await fetch(`${LLAMA_PARSE_URL}/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!uploadResponse.ok) {
    console.error("[ingestion] LlamaParse upload failed", uploadResponse.status);
    return [];
  }

  const job = (await uploadResponse.json()) as LlamaParseJob;
  console.info("[ingestion] LlamaParse job created", { jobId: job.id });

  // Poll for completion
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const statusResponse = await fetch(`${LLAMA_PARSE_URL}/job/${job.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!statusResponse.ok) continue;

    const status = (await statusResponse.json()) as LlamaParseJob;
    if (status.status === "SUCCESS") {
      const resultResponse = await fetch(`${LLAMA_PARSE_URL}/job/${job.id}/result/markdown`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (!resultResponse.ok) return [];

      const result = (await resultResponse.json()) as LlamaParseResult;
      return extractTablesFromMarkdown(result.markdown, parsedDocument);
    }

    if (status.status === "ERROR") {
      console.error("[ingestion] LlamaParse job failed");
      return [];
    }
  }

  console.error("[ingestion] LlamaParse polling timed out");
  return [];
}

// Fallback: detect table-like patterns in parsed text and confirm with Gemini.
async function extractTablesWithFallback(
  parsedDocument: ParsedDocument,
): Promise<ExtractedTable[]> {
  console.info("[ingestion] Using fallback table extraction");

  const tables: ExtractedTable[] = [];
  const tablePatterns: { text: string; pageNumber: number; precedingContext: string }[] = [];

  for (const page of parsedDocument.pages) {
    const lines = page.text.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect pipe-delimited tables
      if (line.includes("|") && line.split("|").length >= 3) {
        const tableLines: string[] = [line];
        let j = i + 1;
        while (j < lines.length && (lines[j].includes("|") || lines[j].trim() === "")) {
          if (lines[j].trim()) tableLines.push(lines[j]);
          j++;
        }

        if (tableLines.length >= 2) {
          const precedingContext = lines
            .slice(Math.max(0, i - 3), i)
            .join("\n")
            .trim();
          tablePatterns.push({
            text: tableLines.join("\n"),
            pageNumber: page.pageNumber,
            precedingContext,
          });
          i = j - 1;
          continue;
        }
      }

      // Detect aligned columns (multiple groups of whitespace separating values)
      const columnPattern = /\S+\s{2,}\S+\s{2,}\S+/;
      if (columnPattern.test(line)) {
        const tableLines: string[] = [line];
        let j = i + 1;
        while (j < lines.length && (columnPattern.test(lines[j]) || lines[j].trim() === "")) {
          if (lines[j].trim()) tableLines.push(lines[j]);
          j++;
        }

        if (tableLines.length >= 3) {
          const precedingContext = lines
            .slice(Math.max(0, i - 3), i)
            .join("\n")
            .trim();
          tablePatterns.push({
            text: tableLines.join("\n"),
            pageNumber: page.pageNumber,
            precedingContext,
          });
          i = j - 1;
        }
      }
    }
  }

  if (tablePatterns.length === 0) return [];

  // Use Gemini to confirm and structure the detected tables
  const llm = getLLM();

  for (const pattern of tablePatterns) {
    try {
      const response = await llm.invoke([
        {
          role: "system",
          content:
            "You are a table extraction assistant. Given text that might be a table, output it as a markdown table. If the text is NOT a table, respond with exactly: NOT_A_TABLE. Output only the markdown table or NOT_A_TABLE, nothing else.",
        },
        {
          role: "user",
          content: `Convert this to a markdown table if it is one:\n\n${pattern.text}`,
        },
      ]);

      const content =
        typeof response.content === "string"
          ? response.content.trim()
          : String(response.content).trim();

      if (content === "NOT_A_TABLE" || !content.includes("|")) continue;

      const { headers, rows } = parseMarkdownTable(content);
      if (headers.length === 0) continue;

      // Detect section title from preceding context
      let sectionTitle: string | null = null;
      const contextLines = pattern.precedingContext.split("\n").filter(Boolean);
      for (let i = contextLines.length - 1; i >= 0; i--) {
        const line = contextLines[i].trim();
        if (
          /^[A-Z][A-Z\s\d\-&,]{5,}$/.test(line) ||
          /^\d+(\.\d+)*\s+[A-Z]/.test(line) ||
          /^section\s+\d+/i.test(line)
        ) {
          sectionTitle = line;
          break;
        }
      }

      tables.push({
        markdown: content,
        headers,
        rows,
        rawText: pattern.text,
        pageNumber: pattern.pageNumber,
        precedingContext: pattern.precedingContext,
        sectionTitle,
      });
    } catch (error) {
      console.error("[ingestion] Fallback table confirmation failed", error);
    }
  }

  return tables;
}

// Main export: extract tables using LlamaParse if available, else fallback.
export async function extractTables(
  buffer: Buffer,
  parsedDocument: ParsedDocument,
): Promise<ExtractedTable[]> {
  console.info("[ingestion] Starting table extraction");

  let tables: ExtractedTable[];

  if (process.env.LLAMA_PARSE_API_KEY) {
    tables = await extractTablesWithLlamaParse(buffer, parsedDocument);
    if (tables.length === 0) {
      console.info("[ingestion] LlamaParse returned no tables, trying fallback");
      tables = await extractTablesWithFallback(parsedDocument);
    }
  } else {
    tables = await extractTablesWithFallback(parsedDocument);
  }

  console.info("[ingestion] Table extraction complete", { tableCount: tables.length });
  return tables;
}
