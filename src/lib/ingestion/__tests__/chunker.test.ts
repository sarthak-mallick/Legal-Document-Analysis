import { describe, expect, it } from "vitest";

import { chunkDocument } from "../chunker";
import type { ExtractedTable, ParsedDocument } from "../types";

function makeDoc(pages: { pageNumber: number; text: string }[]): ParsedDocument {
  return { metadata: { pageCount: pages.length }, pages };
}

describe("chunkDocument", () => {
  it("chunks a single short page into one chunk", async () => {
    const doc = makeDoc([{ pageNumber: 1, text: "This is a short paragraph." }]);
    const chunks = await chunkDocument(doc);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("This is a short paragraph.");
    expect(chunks[0].chunkType).toBe("text");
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it("splits long text into multiple overlapping chunks", async () => {
    const longText = "Word ".repeat(300); // ~1500 chars
    const doc = makeDoc([{ pageNumber: 1, text: longText }]);
    const chunks = await chunkDocument(doc);

    expect(chunks.length).toBeGreaterThan(1);
    // All chunks should be text type
    for (const chunk of chunks) {
      expect(chunk.chunkType).toBe("text");
    }
  });

  it("assigns sequential chunkIndex values", async () => {
    const longText = "Sentence one. ".repeat(100);
    const doc = makeDoc([{ pageNumber: 1, text: longText }]);
    const chunks = await chunkDocument(doc);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i);
    }
  });

  it("preserves page numbers across multiple pages", async () => {
    const doc = makeDoc([
      { pageNumber: 1, text: "Page one content." },
      { pageNumber: 2, text: "Page two content." },
      { pageNumber: 3, text: "Page three content." },
    ]);
    const chunks = await chunkDocument(doc);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[1].pageNumber).toBe(2);
    expect(chunks[2].pageNumber).toBe(3);
  });

  it("detects ALL CAPS section titles from preceding text", async () => {
    // detectSectionTitle looks at text *before* the chunk, so the heading
    // must appear in a preceding portion of the page text.
    const text = "COVERAGE LIMITS\nFirst paragraph of this section.\n\nYour policy covers up to $500,000 in damages. " + "Extra text. ".repeat(80);
    const doc = makeDoc([{ pageNumber: 1, text }]);
    const chunks = await chunkDocument(doc);

    // The second chunk should pick up the heading from preceding text
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].sectionTitle).toBe("COVERAGE LIMITS");
  });

  it("detects numbered section titles from preceding text", async () => {
    const text = "3.1 Liability Coverage\nFirst paragraph.\n\nThe insurer will pay for damages. " + "More text. ".repeat(80);
    const doc = makeDoc([{ pageNumber: 1, text }]);
    const chunks = await chunkDocument(doc);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].sectionTitle).toBe("3.1 Liability Coverage");
  });

  it("detects 'Section N' titles from preceding text", async () => {
    const text = "Section 5 Exclusions\nFirst paragraph.\n\nThe following are excluded from coverage. " + "Details. ".repeat(80);
    const doc = makeDoc([{ pageNumber: 1, text }]);
    const chunks = await chunkDocument(doc);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].sectionTitle).toBe("Section 5 Exclusions");
  });

  it("returns null sectionTitle when no heading is found", async () => {
    const text = "just some regular lowercase text without any heading patterns";
    const doc = makeDoc([{ pageNumber: 1, text }]);
    const chunks = await chunkDocument(doc);

    expect(chunks[0].sectionTitle).toBeNull();
  });

  it("handles tables as atomic chunks", async () => {
    const tableRawText = "Type | Limit\nLiability | $500,000";
    const pageText = `Some intro text.\n${tableRawText}\nSome trailing text.`;
    const doc = makeDoc([{ pageNumber: 1, text: pageText }]);

    const tables: ExtractedTable[] = [
      {
        markdown: "| Type | Limit |\n|---|---|\n| Liability | $500,000 |",
        headers: ["Type", "Limit"],
        rows: [["Liability", "$500,000"]],
        rawText: tableRawText,
        pageNumber: 1,
        precedingContext: "Some intro text.",
        sectionTitle: "Coverage Summary",
      },
    ];

    const chunks = await chunkDocument(doc, tables);

    const tableChunks = chunks.filter((c) => c.chunkType === "table");
    const textChunks = chunks.filter((c) => c.chunkType === "text");

    expect(tableChunks).toHaveLength(1);
    expect(tableChunks[0].content).toBe(tables[0].markdown);
    expect(tableChunks[0].sectionTitle).toBe("Coverage Summary");
    expect(tableChunks[0].metadata).toEqual({
      table_markdown: tables[0].markdown,
      table_data: { headers: ["Type", "Limit"], rows: [["Liability", "$500,000"]] },
      preceding_context: "Some intro text.",
    });

    // Table raw text should be removed from text chunks
    for (const chunk of textChunks) {
      expect(chunk.content).not.toContain("Liability | $500,000");
    }
  });

  it("handles empty pages gracefully", async () => {
    const doc = makeDoc([{ pageNumber: 1, text: "   " }]);
    const chunks = await chunkDocument(doc);

    expect(chunks).toHaveLength(0);
  });

  it("handles multiple tables on the same page", async () => {
    const table1Raw = "A | B\n1 | 2";
    const table2Raw = "X | Y\n3 | 4";
    const pageText = `Intro.\n${table1Raw}\nMiddle.\n${table2Raw}\nEnd.`;
    const doc = makeDoc([{ pageNumber: 1, text: pageText }]);

    const tables: ExtractedTable[] = [
      {
        markdown: "| A | B |\n|---|---|\n| 1 | 2 |",
        headers: ["A", "B"],
        rows: [["1", "2"]],
        rawText: table1Raw,
        pageNumber: 1,
        precedingContext: "Intro.",
        sectionTitle: null,
      },
      {
        markdown: "| X | Y |\n|---|---|\n| 3 | 4 |",
        headers: ["X", "Y"],
        rows: [["3", "4"]],
        rawText: table2Raw,
        pageNumber: 1,
        precedingContext: "Middle.",
        sectionTitle: null,
      },
    ];

    const chunks = await chunkDocument(doc, tables);
    const tableChunks = chunks.filter((c) => c.chunkType === "table");

    expect(tableChunks).toHaveLength(2);
  });
});
