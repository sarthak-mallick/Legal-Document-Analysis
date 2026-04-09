import { describe, expect, it } from "vitest";

import { buildSystemPrompt, SYSTEM_PROMPT } from "../system";

describe("buildSystemPrompt", () => {
  it("returns base prompt when no document types provided", () => {
    expect(buildSystemPrompt([])).toBe(SYSTEM_PROMPT);
  });

  it("returns base prompt for unknown document types", () => {
    expect(buildSystemPrompt(["unknown_type"])).toBe(SYSTEM_PROMPT);
  });

  it("appends insurance policy profile", () => {
    const result = buildSystemPrompt(["insurance_policy"]);

    expect(result).toContain(SYSTEM_PROMPT);
    expect(result).toContain("Coverage types, limits, and sublimits");
    expect(result).toContain("Exclusions and limitations");
    expect(result).toContain("Deductible amounts");
  });

  it("appends lease agreement profile", () => {
    const result = buildSystemPrompt(["lease_agreement"]);

    expect(result).toContain("Rent amount, due dates, and escalation terms");
    expect(result).toContain("Security deposit terms");
  });

  it("appends employment contract profile", () => {
    const result = buildSystemPrompt(["employment_contract"]);

    expect(result).toContain("Non-compete and non-solicitation");
    expect(result).toContain("Intellectual property assignment");
  });

  it("appends NDA profile", () => {
    const result = buildSystemPrompt(["nda"]);

    expect(result).toContain("Definition of confidential information");
    expect(result).toContain("Remedies for breach");
  });

  it("appends terms of service profile", () => {
    const result = buildSystemPrompt(["terms_of_service"]);

    expect(result).toContain("Dispute resolution and arbitration");
    expect(result).toContain("Indemnification requirements");
  });

  it("combines multiple document type profiles", () => {
    const result = buildSystemPrompt(["insurance_policy", "lease_agreement"]);

    expect(result).toContain("Deductible amounts");
    expect(result).toContain("Security deposit terms");
  });

  it("deduplicates document types", () => {
    const result = buildSystemPrompt(["insurance_policy", "insurance_policy"]);
    const count = (result.match(/Coverage types, limits, and sublimits/g) ?? []).length;

    expect(count).toBe(1);
  });

  it("filters out empty/falsy document types", () => {
    const result = buildSystemPrompt(["", "insurance_policy"]);

    expect(result).toContain("Deductible amounts");
  });

  it("always includes base citation instructions", () => {
    const result = buildSystemPrompt(["insurance_policy"]);

    expect(result).toContain("Cite sources using numbered footnotes");
    expect(result).toContain("plain English");
  });
});
