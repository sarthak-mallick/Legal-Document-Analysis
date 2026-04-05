import { describe, expect, it } from "vitest";

// extractCitations is not exported, so we test it indirectly via a local copy.
// We replicate the pure function here to test its logic in isolation.
import type { Citation } from "@/types/conversation";

interface ChunkRef {
  id: string;
  section_title: string | null;
  page_number: number | null;
  content: string;
}

// Mirror of the extractCitations function from synthesize.ts
function extractCitations(text: string, chunks: ChunkRef[]): Citation[] {
  const citations: Citation[] = [];
  const seen = new Set<string>();

  const pattern = /\[Section:\s*([^,\]]+),\s*Page:\s*(\d+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const sectionRef = match[1].trim();
    const pageRef = parseInt(match[2], 10);

    const matchingChunk =
      chunks.find(
        (c) =>
          (c.section_title?.toLowerCase().includes(sectionRef.toLowerCase()) ||
            sectionRef.toLowerCase().includes(c.section_title?.toLowerCase() ?? "")) &&
          c.page_number === pageRef,
      ) ?? chunks.find((c) => c.page_number === pageRef);

    if (matchingChunk && !seen.has(matchingChunk.id)) {
      seen.add(matchingChunk.id);
      citations.push({
        chunk_id: matchingChunk.id,
        section_title: matchingChunk.section_title,
        page_number: matchingChunk.page_number,
        snippet: matchingChunk.content.slice(0, 200),
      });
    }
  }

  for (const chunk of chunks) {
    if (!seen.has(chunk.id)) {
      seen.add(chunk.id);
      citations.push({
        chunk_id: chunk.id,
        section_title: chunk.section_title,
        page_number: chunk.page_number,
        snippet: chunk.content.slice(0, 200),
      });
    }
  }

  return citations;
}

const makeChunk = (overrides: Partial<ChunkRef> = {}): ChunkRef => ({
  id: "chunk-1",
  section_title: "Coverage Details",
  page_number: 3,
  content: "The deductible is $500 for each covered loss event.",
  ...overrides,
});

describe("extractCitations", () => {
  it("extracts citation from [Section: X, Page: Y] format", () => {
    const text = "Your deductible is $500 [Section: Coverage Details, Page: 3].";
    const chunks = [makeChunk()];

    const citations = extractCitations(text, chunks);

    expect(citations).toHaveLength(1);
    expect(citations[0].chunk_id).toBe("chunk-1");
    expect(citations[0].section_title).toBe("Coverage Details");
    expect(citations[0].page_number).toBe(3);
  });

  it("matches by page number when section doesn't match exactly", () => {
    const text = "Coverage is described in [Section: General Coverage, Page: 3].";
    const chunks = [makeChunk({ section_title: "Detailed Coverage Info" })];

    const citations = extractCitations(text, chunks);

    // Falls back to page number match
    expect(citations).toHaveLength(1);
    expect(citations[0].page_number).toBe(3);
  });

  it("deduplicates citations by chunk id", () => {
    const text =
      "See [Section: Coverage Details, Page: 3] and also [Section: Coverage Details, Page: 3].";
    const chunks = [makeChunk()];

    const citations = extractCitations(text, chunks);

    expect(citations).toHaveLength(1);
  });

  it("extracts multiple different citations", () => {
    const text = "See [Section: Coverage, Page: 3] and [Section: Exclusions, Page: 7].";
    const chunks = [
      makeChunk({ id: "c1", section_title: "Coverage", page_number: 3 }),
      makeChunk({ id: "c2", section_title: "Exclusions", page_number: 7 }),
    ];

    const citations = extractCitations(text, chunks);

    expect(citations).toHaveLength(2);
    expect(citations[0].chunk_id).toBe("c1");
    expect(citations[1].chunk_id).toBe("c2");
  });

  it("appends unreferenced chunks as fallback citations", () => {
    const text = "The answer is 42."; // No citation references
    const chunks = [
      makeChunk({ id: "c1" }),
      makeChunk({ id: "c2", section_title: "Other", page_number: 5 }),
    ];

    const citations = extractCitations(text, chunks);

    // Both chunks added as fallback
    expect(citations).toHaveLength(2);
  });

  it("truncates snippet to 200 characters", () => {
    const longContent = "A".repeat(300);
    const text = "See [Section: Coverage Details, Page: 3].";
    const chunks = [makeChunk({ content: longContent })];

    const citations = extractCitations(text, chunks);

    expect(citations[0].snippet).toHaveLength(200);
  });

  it("returns empty array when no chunks provided", () => {
    const citations = extractCitations("Some text", []);

    expect(citations).toHaveLength(0);
  });

  it("handles partial section name matches", () => {
    const text = "See [Section: Coverage, Page: 3].";
    const chunks = [makeChunk({ section_title: "Coverage Details" })];

    const citations = extractCitations(text, chunks);

    // "Coverage" is included in "Coverage Details"
    expect(citations).toHaveLength(1);
    expect(citations[0].section_title).toBe("Coverage Details");
  });

  it("does not duplicate chunks already matched by reference", () => {
    const text = "See [Section: Coverage Details, Page: 3].";
    const chunks = [makeChunk()];

    const citations = extractCitations(text, chunks);

    // Matched by reference, not duplicated in fallback
    expect(citations).toHaveLength(1);
  });
});
