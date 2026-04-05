import { describe, expect, it } from "vitest";

import type { DocumentMeta } from "@/lib/agent/state";
import type { ToolResult } from "@/lib/agent/tools/mcp-tools";
import type { MessageRecord, RetrievedChunk } from "@/types/conversation";

import { buildSynthesisPrompt } from "../synthesis";

const makeChunk = (overrides: Partial<RetrievedChunk> = {}): RetrievedChunk => ({
  id: "chunk-1",
  document_id: "doc-1",
  content: "The deductible is $500.",
  chunk_type: "text",
  section_title: "Coverage Details",
  page_number: 3,
  metadata: {},
  similarity: 0.92,
  ...overrides,
});

const makeMessage = (overrides: Partial<MessageRecord> = {}): MessageRecord => ({
  id: "msg-1",
  conversation_id: "conv-1",
  role: "user",
  content: "What is my deductible?",
  citations: [],
  tool_calls: [],
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

const makeDocMeta = (overrides: Partial<DocumentMeta> = {}): DocumentMeta => ({
  id: "doc-1",
  filename: "home-insurance.pdf",
  documentType: "insurance_policy",
  ...overrides,
});

describe("buildSynthesisPrompt", () => {
  it("includes the user query", () => {
    const result = buildSynthesisPrompt("What is my deductible?", [], []);
    expect(result).toContain("What is my deductible?");
  });

  it("shows 'no relevant sections' when chunks are empty", () => {
    const result = buildSynthesisPrompt("test", [], []);
    expect(result).toContain("No relevant document sections were found");
  });

  it("formats chunk context with section and page", () => {
    const result = buildSynthesisPrompt("test", [makeChunk()], []);
    expect(result).toContain("Section: Coverage Details");
    expect(result).toContain("Page: 3");
    expect(result).toContain("The deductible is $500.");
  });

  it("marks table chunks with [TABLE] label", () => {
    const chunk = makeChunk({
      chunk_type: "table",
      metadata: { table_markdown: "| Col | Val |\n|---|---|\n| A | 1 |" },
    });
    const result = buildSynthesisPrompt("test", [chunk], []);
    expect(result).toContain("[TABLE]");
    expect(result).toContain("| Col | Val |");
  });

  it("includes conversation history when provided", () => {
    const history = [
      makeMessage({ role: "user", content: "Tell me about coverage." }),
      makeMessage({ role: "assistant", content: "Your policy covers..." }),
    ];
    const result = buildSynthesisPrompt("follow up", [], history);
    expect(result).toContain("Conversation History");
    expect(result).toContain("User: Tell me about coverage.");
    expect(result).toContain("Assistant: Your policy covers...");
  });

  it("omits history section when no messages", () => {
    const result = buildSynthesisPrompt("test", [], []);
    expect(result).not.toContain("Conversation History");
  });

  it("includes tool results when provided", () => {
    const tools: ToolResult[] = [
      {
        tool: "glossary_lookup",
        input: { term: "deductible" },
        output: "Amount you pay before insurance kicks in.",
      },
    ];
    const result = buildSynthesisPrompt("test", [], [], tools);
    expect(result).toContain("External Tool Results");
    expect(result).toContain("glossary_lookup");
    expect(result).toContain("Amount you pay before insurance kicks in.");
  });

  it("adds external source distinction instruction when tools used", () => {
    const tools: ToolResult[] = [
      {
        tool: "web_search",
        input: { query: "average deductible" },
        output: "National average is $750.",
      },
    ];
    const result = buildSynthesisPrompt("test", [], [], tools);
    expect(result).toContain(
      "distinguish between information from the document and information from external sources",
    );
  });

  it("uses single-doc citation format for one document", () => {
    const result = buildSynthesisPrompt("test", [makeChunk()], [], [], [makeDocMeta()]);
    expect(result).toContain("[Section: <title>, Page: <number>]");
    expect(result).not.toContain("[Document:");
  });

  it("uses multi-doc citation format and groups by document", () => {
    const doc1 = makeDocMeta({ id: "doc-1", filename: "policy-a.pdf" });
    const doc2 = makeDocMeta({ id: "doc-2", filename: "policy-b.pdf" });
    const chunks = [
      makeChunk({ document_id: "doc-1", content: "Chunk from A" }),
      makeChunk({ id: "chunk-2", document_id: "doc-2", content: "Chunk from B" }),
    ];
    const result = buildSynthesisPrompt("compare", chunks, [], [], [doc1, doc2]);
    expect(result).toContain("[Document: <name>, Section: <title>, Page: <number>]");
    expect(result).toContain("### Document: policy-a.pdf");
    expect(result).toContain("### Document: policy-b.pdf");
  });

  it("includes comparison context when provided", () => {
    const result = buildSynthesisPrompt(
      "compare",
      [],
      [],
      [],
      [],
      "Policy A has X, Policy B has Y.",
    );
    expect(result).toContain("Cross-Document Comparison Analysis");
    expect(result).toContain("Policy A has X, Policy B has Y.");
  });

  it("omits comparison section when null", () => {
    const result = buildSynthesisPrompt("test", [], [], [], [], null);
    expect(result).not.toContain("Cross-Document Comparison");
  });
});
