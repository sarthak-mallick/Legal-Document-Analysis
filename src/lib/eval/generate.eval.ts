import { test } from "vitest";

import { generateDataset } from "@/lib/eval/generate-dataset";

// Thin executable wrapper so the generator can run through Vitest (which already
// provides TS + the "@" alias). Not part of `npm test` — it only matches the
// dedicated vitest.eval.config.ts include pattern.
test("generate eval dataset", async () => {
  await generateDataset();
}, 600_000);
