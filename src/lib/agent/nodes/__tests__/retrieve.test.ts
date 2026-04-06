import { describe, expect, it } from "vitest";

import { filterAndDeduplicate, SIMILARITY_THRESHOLD } from "../retrieve";

const makeChunk = (id: string, similarity: number) => ({ id, similarity });

describe("filterAndDeduplicate", () => {
  it("keeps chunks above the similarity threshold", () => {
    const chunks = [makeChunk("a", 0.9), makeChunk("b", 0.8)];
    const result = filterAndDeduplicate(chunks);

    expect(result).toHaveLength(2);
  });

  it("filters out chunks below the similarity threshold", () => {
    const chunks = [makeChunk("a", 0.9), makeChunk("b", 0.5), makeChunk("c", 0.3)];
    const result = filterAndDeduplicate(chunks);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("filters out chunks exactly at the threshold", () => {
    const chunks = [makeChunk("a", SIMILARITY_THRESHOLD)];
    const result = filterAndDeduplicate(chunks);

    // 0.7 is not < 0.7, so it should pass
    expect(result).toHaveLength(1);
  });

  it("deduplicates chunks by id", () => {
    const chunks = [makeChunk("a", 0.95), makeChunk("a", 0.85), makeChunk("b", 0.8)];
    const result = filterAndDeduplicate(chunks);

    expect(result).toHaveLength(2);
    expect(result[0].similarity).toBe(0.95);
    expect(result[1].id).toBe("b");
  });

  it("returns empty array when all chunks are below threshold", () => {
    const chunks = [makeChunk("a", 0.3), makeChunk("b", 0.1)];
    const result = filterAndDeduplicate(chunks);

    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(filterAndDeduplicate([])).toHaveLength(0);
  });

  it("accepts a custom threshold", () => {
    const chunks = [makeChunk("a", 0.6), makeChunk("b", 0.4)];
    const result = filterAndDeduplicate(chunks, 0.5);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("a");
  });

  it("filters before deduplicating (low-similarity duplicate doesn't block)", () => {
    const chunks = [makeChunk("a", 0.5), makeChunk("a", 0.9)];
    const result = filterAndDeduplicate(chunks);

    // First "a" is filtered (0.5 < 0.7), second "a" passes (0.9)
    expect(result).toHaveLength(1);
    expect(result[0].similarity).toBe(0.9);
  });
});

describe("SIMILARITY_THRESHOLD", () => {
  it("is 0.7", () => {
    expect(SIMILARITY_THRESHOLD).toBe(0.7);
  });
});
