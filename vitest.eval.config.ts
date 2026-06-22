import { resolve } from "path";
import { defineConfig } from "vitest/config";

// Separate config for the RAG evaluation harness. Kept apart from vitest.config.ts
// so `npm test` stays fast and offline — eval runs make real LLM/DB calls.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/lib/eval/**/*.eval.ts"],
    setupFiles: ["src/lib/eval/setup-env.ts"],
    // LLM + DB calls are slow; run files/tests sequentially to respect rate limits.
    fileParallelism: false,
    maxConcurrency: 1,
    testTimeout: 1_200_000,
    hookTimeout: 120_000,
    // No coverage — this isn't a unit-test run.
    coverage: { enabled: false },
  },
});
