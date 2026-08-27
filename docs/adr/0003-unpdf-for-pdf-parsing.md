# ADR-0003: `unpdf` for PDF parsing

**Status:** Accepted (supersedes the interim `pdf-parse@1.1.1` workaround of 2026-04-08)
**Date:** 2026-04-08, revised 2026-06-30

## Context

PDF upload failed under Next.js 16 with
`DataCloneError: Cannot transfer object of unsupported type` inside
`LoopbackPort.postMessage`.

`pdf-parse` v2 depends on `pdfjs-dist` v5. In Node.js there are no Web Workers, so
`pdfjs-dist` uses a "fake worker" (`LoopbackPort`) that simulates `postMessage` via
`structuredClone(obj, { transfer })`. Next.js 16's Turbopack bundles server-side code in
a way that breaks that transfer path.

None of the obvious escapes worked:

- `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` in `next.config` — Turbopack
  ignores this for transitive dependencies.
- `PDFParse.setWorker()` to use a real worker thread — same `structuredClone` error.
- `createRequire` to bypass bundling — the module loaded, but `pdfjs-dist` internals
  still failed.

The interim fix was a downgrade to `pdf-parse@1.1.1` (an older `pdfjs-dist` without the
problematic transfer code), loaded via `createRequire(process.cwd() + "/package.json")`.
That worked, but v1 returns the **entire document as a single page**, and page numbers
are required for citations.

## Decision

Use **`unpdf`** for per-page text extraction:
`extractText(..., { mergePages: false })` returns `text: string[]`, one entry per page.
See `src/lib/ingestion/pdf-parser.ts`.

LlamaParse remains an optional, separate path for table extraction
(`LLAMA_PARSE_API_KEY`); it is not a replacement for the text extractor.

## Consequences

- Page-accurate citations are possible again — the single-page regression from
  `pdf-parse` v1 is gone.
- `unpdf` is built for serverless/edge runtimes with no native bindings, so it survives
  Turbopack bundling and suits the Vercel target. No `createRequire` escape hatch needed.
- The `pdf-parse` and `pdfjs-dist` dependencies, the `serverExternalPackages` entry, and
  the `createRequire` workaround are all removed.
- Documentation referring to `pdf-parse` is stale; `README.md` and `CLAUDE.md` were
  corrected. Watch for it resurfacing in older docs.
