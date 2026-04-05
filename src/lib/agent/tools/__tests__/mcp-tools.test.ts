import { describe, expect, it } from "vitest";

import { lookupTerm } from "../mcp-tools";

describe("lookupTerm", () => {
  it("finds an exact match", () => {
    const result = lookupTerm("deductible");

    expect(result.tool).toBe("lookup_term");
    expect(result.input).toEqual({ term: "deductible" });
    expect(result.output).toContain("deductible");
    expect(result.output).toContain("out of pocket");
  });

  it("is case-insensitive", () => {
    const result = lookupTerm("DEDUCTIBLE");

    expect(result.output).toContain("deductible");
    expect(result.output).not.toContain("No glossary entry found");
  });

  it("trims whitespace", () => {
    const result = lookupTerm("  deductible  ");

    expect(result.output).toContain("deductible");
    expect(result.output).not.toContain("No glossary entry found");
  });

  it("performs substring matching", () => {
    const result = lookupTerm("actual cash");

    expect(result.output).toContain("actual cash value");
  });

  it("performs fuzzy matching for typos", () => {
    // "deductable" is within edit distance 2 of "deductible"
    const result = lookupTerm("deductable");

    expect(result.output).toContain("deductible");
    expect(result.output).not.toContain("No glossary entry found");
  });

  it("returns not-found message for unknown terms", () => {
    const result = lookupTerm("qzxwv_gibberish_98765");

    expect(result.tool).toBe("lookup_term");
    expect(result.output).toContain("No glossary entry found");
    expect(result.output).toContain("qzxwv_gibberish_98765");
  });

  it("includes related terms when available", () => {
    const result = lookupTerm("deductible");

    expect(result.output).toContain("Related terms:");
    expect(result.output).toContain("premium");
  });

  it("includes examples when available", () => {
    const result = lookupTerm("deductible");

    expect(result.output).toContain("Example:");
    expect(result.output).toContain("$500");
  });

  it("handles multi-word terms", () => {
    const result = lookupTerm("bodily injury");

    expect(result.output).toContain("bodily injury");
    expect(result.output).not.toContain("No glossary entry found");
  });

  it("finds terms via reverse substring match", () => {
    // "non-compete" is a substring of "non-compete clause"
    const result = lookupTerm("non-compete");

    expect(result.output).not.toContain("No glossary entry found");
  });
});
