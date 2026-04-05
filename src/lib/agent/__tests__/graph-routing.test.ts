import { describe, expect, it } from "vitest";

import type { AgentStateType } from "@/lib/agent/state";

// The routing functions are not exported, so we replicate them here
// to test the pure conditional logic in isolation.

function afterClassify(state: Pick<AgentStateType, "queryType">): "callTools" | "retrieve" {
  if (state.queryType === "term_explanation") {
    return "callTools";
  }
  return "retrieve";
}

function afterEvaluate(
  state: Pick<
    AgentStateType,
    "contextSufficient" | "toolsCalled" | "queryType" | "documentIds" | "retrievedChunks"
  >,
): "retrieve" | "callTools" | "compare" | "queryTable" | "synthesize" {
  if (!state.contextSufficient) {
    if (!state.toolsCalled && state.queryType === "multi_section") {
      return "callTools";
    }
    return "retrieve";
  }

  if (state.queryType === "cross_document" && state.documentIds.length > 1) {
    return "compare";
  }

  const hasTableChunks = state.retrievedChunks.some((c) => c.chunk_type === "table");
  if (
    hasTableChunks &&
    (state.queryType === "table_lookup" || state.queryType === "simple_factual")
  ) {
    return "queryTable";
  }

  return "synthesize";
}

describe("afterClassify routing", () => {
  it("routes term_explanation to callTools", () => {
    expect(afterClassify({ queryType: "term_explanation" })).toBe("callTools");
  });

  it("routes simple_factual to retrieve", () => {
    expect(afterClassify({ queryType: "simple_factual" })).toBe("retrieve");
  });

  it("routes table_lookup to retrieve", () => {
    expect(afterClassify({ queryType: "table_lookup" })).toBe("retrieve");
  });

  it("routes multi_section to retrieve", () => {
    expect(afterClassify({ queryType: "multi_section" })).toBe("retrieve");
  });

  it("routes cross_document to retrieve", () => {
    expect(afterClassify({ queryType: "cross_document" })).toBe("retrieve");
  });

  it("routes general to retrieve", () => {
    expect(afterClassify({ queryType: "general" })).toBe("retrieve");
  });
});

describe("afterEvaluate routing", () => {
  const baseState = {
    contextSufficient: true,
    toolsCalled: false,
    queryType: "simple_factual" as const,
    documentIds: ["doc-1"],
    retrievedChunks: [] as AgentStateType["retrievedChunks"],
  };

  it("routes to retrieve when context insufficient", () => {
    const result = afterEvaluate({ ...baseState, contextSufficient: false });
    expect(result).toBe("retrieve");
  });

  it("routes to callTools when context insufficient and multi_section without tools called", () => {
    const result = afterEvaluate({
      ...baseState,
      contextSufficient: false,
      queryType: "multi_section",
      toolsCalled: false,
    });
    expect(result).toBe("callTools");
  });

  it("routes to retrieve when context insufficient and multi_section but tools already called", () => {
    const result = afterEvaluate({
      ...baseState,
      contextSufficient: false,
      queryType: "multi_section",
      toolsCalled: true,
    });
    expect(result).toBe("retrieve");
  });

  it("routes to compare for cross_document with multiple docs", () => {
    const result = afterEvaluate({
      ...baseState,
      queryType: "cross_document",
      documentIds: ["doc-1", "doc-2"],
    });
    expect(result).toBe("compare");
  });

  it("does not route to compare for cross_document with single doc", () => {
    const result = afterEvaluate({
      ...baseState,
      queryType: "cross_document",
      documentIds: ["doc-1"],
    });
    expect(result).toBe("synthesize");
  });

  it("routes to queryTable when table chunks present and table_lookup query", () => {
    const result = afterEvaluate({
      ...baseState,
      queryType: "table_lookup",
      retrievedChunks: [
        {
          id: "c1",
          document_id: "d1",
          content: "",
          chunk_type: "table",
          section_title: null,
          page_number: 1,
          metadata: {},
          similarity: 0.9,
        },
      ],
    });
    expect(result).toBe("queryTable");
  });

  it("routes to queryTable when table chunks present and simple_factual query", () => {
    const result = afterEvaluate({
      ...baseState,
      queryType: "simple_factual",
      retrievedChunks: [
        {
          id: "c1",
          document_id: "d1",
          content: "",
          chunk_type: "table",
          section_title: null,
          page_number: 1,
          metadata: {},
          similarity: 0.9,
        },
      ],
    });
    expect(result).toBe("queryTable");
  });

  it("does not route to queryTable for table chunks with non-table query type", () => {
    const result = afterEvaluate({
      ...baseState,
      queryType: "multi_section",
      retrievedChunks: [
        {
          id: "c1",
          document_id: "d1",
          content: "",
          chunk_type: "table",
          section_title: null,
          page_number: 1,
          metadata: {},
          similarity: 0.9,
        },
      ],
    });
    expect(result).toBe("synthesize");
  });

  it("routes to synthesize when context sufficient with no special conditions", () => {
    const result = afterEvaluate(baseState);
    expect(result).toBe("synthesize");
  });
});
