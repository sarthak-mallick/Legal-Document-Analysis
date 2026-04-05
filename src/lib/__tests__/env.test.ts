import { afterEach, describe, expect, it, vi } from "vitest";

import { getNumberEnv, getRequiredEnv } from "../env";

describe("getRequiredEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the value when env var exists", () => {
    vi.stubEnv("TEST_VAR", "hello");
    expect(getRequiredEnv("TEST_VAR")).toBe("hello");
  });

  it("throws when env var is missing", () => {
    delete process.env.TEST_MISSING_VAR;
    expect(() => getRequiredEnv("TEST_MISSING_VAR")).toThrow(
      "Missing required environment variable: TEST_MISSING_VAR",
    );
  });

  it("throws when env var is empty string", () => {
    vi.stubEnv("TEST_EMPTY", "");
    expect(() => getRequiredEnv("TEST_EMPTY")).toThrow(
      "Missing required environment variable: TEST_EMPTY",
    );
  });
});

describe("getNumberEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the parsed number when env var is a valid number", () => {
    vi.stubEnv("TEST_NUM", "42");
    expect(getNumberEnv("TEST_NUM", 0)).toBe(42);
  });

  it("returns the fallback when env var is missing", () => {
    delete process.env.TEST_NUM_MISSING;
    expect(getNumberEnv("TEST_NUM_MISSING", 99)).toBe(99);
  });

  it("returns the fallback when env var is empty", () => {
    vi.stubEnv("TEST_NUM_EMPTY", "");
    expect(getNumberEnv("TEST_NUM_EMPTY", 10)).toBe(10);
  });

  it("handles decimal numbers", () => {
    vi.stubEnv("TEST_DECIMAL", "3.14");
    expect(getNumberEnv("TEST_DECIMAL", 0)).toBeCloseTo(3.14);
  });

  it("handles negative numbers", () => {
    vi.stubEnv("TEST_NEG", "-5");
    expect(getNumberEnv("TEST_NEG", 0)).toBe(-5);
  });

  it("throws when env var is not a valid number", () => {
    vi.stubEnv("TEST_NAN", "not-a-number");
    expect(() => getNumberEnv("TEST_NAN", 0)).toThrow(
      "Environment variable TEST_NAN must be a number",
    );
  });

  it("handles zero as a valid value", () => {
    vi.stubEnv("TEST_ZERO", "0");
    expect(getNumberEnv("TEST_ZERO", 99)).toBe(0);
  });
});
