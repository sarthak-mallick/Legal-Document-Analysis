# Challenges Log

Hard-won fixes and non-obvious issues encountered during development.

---

## pdf-parse v2 / pdfjs-dist v5 incompatible with Next.js 16

**Date:** 2026-04-08
**Time spent:** ~1 hour
**Symptom:** PDF upload fails with `DataCloneError: Cannot transfer object of unsupported type` inside `LoopbackPort.postMessage`.

**Root cause:** `pdf-parse` v2 depends on `pdfjs-dist` v5. In Node.js (no Web Workers), pdfjs-dist uses a "fake worker" (`LoopbackPort`) that simulates `postMessage` via `structuredClone(obj, { transfer })`. Next.js 16's Turbopack bundles server-side code in a way that breaks this `structuredClone` transfer path.

**What didn't work:**

- `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` in next.config — Turbopack ignores this for transitive deps
- `PDFParse.setWorker()` to use a real worker thread — still hit the same `structuredClone` error
- `createRequire` to bypass bundling — module loaded but pdfjs-dist internals still failed

**Fix:** Downgraded to `pdf-parse@1.1.1` which uses an older pdfjs-dist without the problematic `structuredClone` transfer code. Loaded via `createRequire(process.cwd() + "/package.json")` to bypass Turbopack bundling entirely.

**Trade-off:** v1 doesn't support per-page text extraction (all text returned as one block). The chunker splits by headings/size anyway, so this has minimal impact on RAG quality.

---

## Button component defaults to type="button"

**Date:** 2026-04-08
**Symptom:** Login and signup forms appear to do nothing when clicking the submit button. No error, no network request, form just doesn't submit.

**Root cause:** The custom `Button` component (`src/components/ui/button.tsx`) defaults `type` to `"button"` instead of the HTML default `"submit"`. Buttons with `type="button"` inside a `<form>` do not trigger form submission.

**Fix:** Added explicit `type="submit"` to buttons inside forms.

---

## Supabase signup requires email confirmation by default

**Date:** 2026-04-08
**Symptom:** After signup, user is redirected to `/dashboard` but immediately bounced back to `/login`. No error shown.

**Root cause:** Supabase requires email confirmation by default. After `signUp()`, no session exists yet (user must click the email link first). The middleware sees no authenticated user and redirects to `/login`.

**Fix:**

1. Signup page now checks if `data.session` exists after `signUp()`. If not, shows a "check your email" confirmation screen instead of redirecting.
2. Added `/auth/callback` route to exchange the email confirmation code for a session.
3. Added `/auth/callback` to the middleware's public paths.

---

## Hardcoded Tailwind colors break dark mode

**Date:** 2026-04-08
**Symptom:** Dark text on dark background throughout the app in dark mode.

**Root cause:** Components used hardcoded `text-slate-*`, `bg-white`, `border-slate-*` classes instead of theme-aware semantic tokens. Additionally, the `.dark` CSS block in `globals.css` was missing overrides for `--color-muted`, `--color-muted-foreground`, and several other tokens.

**Fix:** Replaced all hardcoded color classes across 28 files with semantic tokens (`text-foreground`, `text-muted-foreground`, `bg-card-bg`, `border-border`, `bg-muted`, etc.) and added missing dark mode CSS variable overrides.

---

## LangChain GoogleGenerativeAIEmbeddings returns empty vectors silently

**Date:** 2026-04-08
**Time spent:** ~1.5 hours
**Symptom:** All embeddings come back as 0-dimension vectors. No error thrown. Supabase rejects inserts with "vector must have at least 1 dimension".

**Root cause:** Multiple layered issues:

1. `@langchain/google-genai`'s `GoogleGenerativeAIEmbeddings` wrapper uses `Promise.allSettled` internally, so API errors (404, rate limits) are silently caught and replaced with empty arrays.
2. The `@google/generative-ai` SDK defaults to API version `v1beta`. The embedding model `text-embedding-004` was no longer available on the user's project — the available models had changed to `gemini-embedding-001`.
3. The wrapper doesn't expose the `apiVersion` or `outputDimensionality` options needed to configure the SDK correctly.

**What didn't work:**

- Overriding the private `client` property on the LangChain wrapper — TS private field, and Turbopack may cache the old reference

**Fix:** Bypassed the LangChain wrapper entirely. Called the `@google/generative-ai` SDK directly with `apiVersion: "v1beta"`, model `gemini-embedding-001`, and `outputDimensionality: 768` (to match the DB's `vector(768)` column). Created `embedTexts()` and `embedQuery()` functions as direct replacements.

**Lesson:** Silent failure is worse than loud failure. `Promise.allSettled` in a library wrapper should at least log rejections.

---

## pdf-parse v1 returns entire document as a single page

**Date:** 2026-04-08
**Symptom:** All document chunks have `page_number: 1` regardless of actual page. Retrieval for page-specific questions (e.g., "What is the policy term?") fails because the Policy Schedule on page 3 isn't distinguished from definitions on page 10.

**Root cause:** `pdf-parse` v1 doesn't support per-page text extraction. It concatenates all pages into a single text blob. The chunker assigned every chunk to page 1.

**Fix:** Replaced `pdf-parse` with `unpdf`, which wraps Mozilla's pdf.js and returns a `text: string[]` array with one entry per page. The parser now creates proper per-page `ParsedPage` objects. Result: a 29-page insurance policy went from all chunks on "Page 1" to chunks correctly distributed across 35 pages (unpdf extracts blank pages too, filtered by the parser).

**Trade-off:** `unpdf` doesn't improve table extraction — structured tables are still extracted as fragmented text. LlamaParse or PDFExcavator would be needed for that.

---

## Citation snippets show fragmented PDF text

**Date:** 2026-04-09
**Symptom:** Citation card previews display broken text like `ed Insurance products- NA Clause 4.5.1 of Part D 06 Options available (in case of...` — fragments from table cells and form fields.

**Root cause:** PDF tables and forms are extracted as line-broken text fragments by `unpdf`. The snippet used `chunk.content.slice(0, 200)` which blindly grabbed the first 200 characters regardless of readability.

**Fix:** The `makeSnippet` function now extracts the first real prose sentence (starts with a capital letter, 7+ words, ends with punctuation). If no prose is found, the snippet is left empty and the UI shows just the section title and page number. The citation card and Source Preview handle empty snippets gracefully.

---

## Most chunks have "Unknown section" titles

**Date:** 2026-04-09
**Symptom:** Citation cards show "Unknown section" for the majority of chunks, providing no useful navigation context.

**Root cause:** The chunker's `detectSectionTitle` function only detects ALL-CAPS headings or numbered sections via regex. Chunks without those patterns in their preceding text get `null`. Since sections in legal documents span many chunks, most chunks after the first in a section had no heading in their prefix.

**Fix:** Two changes: (1) Section titles now carry forward during chunking — if a chunk has no detected heading, it inherits the last known section title. (2) The UI falls back to "Page X" when the section title is still null, instead of showing "Unknown section".

---

## LLM and Supabase clients recreated on every call

**Date:** 2026-04-09
**Symptom:** `[langchain] Initializing chat model` appears 6+ times per chat message in server logs. Each agent node (classify, evaluate, synthesize, etc.) creates a new `ChatGoogleGenerativeAI` instance. Same issue with the Supabase admin client and embedding model — all recreated on every function call.

**Root cause:** `getLLM()`, `model()`, and `createSupabaseAdminClient()` were factory functions that constructed a new client instance every time. No caching or reuse.

**Fix:** Cached all three as module-level singletons. Each client is created once on first use and reused for the lifetime of the server process. The `[langchain] Initializing chat model` log now appears only once per server restart.

**Why a singleton works here:** All three clients are HTTP-based (Gemini REST API, Supabase PostgREST). HTTP clients handle concurrent requests internally and get connection reuse via Node.js `keep-alive`. A connection pool would only be needed for direct Postgres TCP connections (e.g., `pg`, `prisma`).

---

## Fake streaming added perceived latency

**Date:** 2026-04-09
**Symptom:** Users wait 5-15 seconds with no visible output before the entire response appears at once. The chat feels unresponsive even though the LLM is generating tokens the whole time.

**Root cause:** The chat route called `agent.invoke()` which buffers the full agent pipeline to completion, then fake-streamed the response in 20-character SSE chunks. The user saw nothing until classify → retrieve → evaluate (×3) → synthesize all finished.

**Fix:** Switched to LangGraph's `graph.streamEvents()` with version `"v2"`. Changed the synthesize node to use `llm.stream()` instead of `llm.invoke()` so individual tokens emit `on_chat_model_stream` events. The route handler filters events by `metadata.langgraph_node === "synthesize"` to only forward tokens from the final synthesis step (not classify/evaluate). Citations, debug info, and DB persistence happen after the stream completes.

**Trade-off:** The "Sources:" text at the end of the LLM response is visible briefly before the client renders citation cards. Stripping it server-side would require buffering the full response, defeating streaming. Accepted as a minor cosmetic issue.

---

## Redundant embedding API calls during retrieval retries

**Date:** 2026-04-09
**Symptom:** The same or similar queries get re-embedded on each retrieval attempt. With 3 retry attempts and sub-query expansion, a single chat message could trigger 5+ embedding API calls.

**Root cause:** `embedQuery()` had no caching — every call hit the Gemini embedding API even for identical input strings.

**Fix:** Added a bounded `Map` cache (max 50 entries) in `embedQuery()`. Identical queries return the cached embedding immediately. The cache persists across requests within the same server instance (safe because embeddings are deterministic for the same input text). Oldest entries are evicted when the cache is full.

---

## Unnecessary LLM evaluation calls for high-confidence retrieval

**Date:** 2026-04-09
**Symptom:** Even when all retrieved chunks have very high similarity scores (>0.8), the agent still spends 1-2 seconds calling the LLM to evaluate whether the context is sufficient.

**Root cause:** The evaluate-context node always called the LLM regardless of retrieval confidence. The only early exit was when zero chunks were retrieved.

**Fix:** Added a fast-path check: if 2+ chunks have similarity ≥ 0.8, skip the LLM evaluation and mark context as sufficient. Both thresholds are configurable via `HIGH_CONFIDENCE_THRESHOLD` and `HIGH_CONFIDENCE_MIN_CHUNKS` env vars.

---

## Sequential DB queries and ingestion steps

**Date:** 2026-04-09
**Symptom:** Chat route fetched conversation history and document metadata sequentially (~100ms each). Ingestion pipeline ran table description generation and document type detection sequentially (~2-5s each).

**Root cause:** Awaited each query/step individually despite them being independent.

**Fix:** Wrapped independent operations in `Promise.all`:

- Chat route: history + document metadata fetched in parallel (saves ~50-100ms per request).
- Ingestion pipeline: `generateTableDescriptions` + `detectDocumentType` run in parallel (saves ~2-5s per upload).

---

## New chat first message shows no response in UI

**Date:** 2026-04-09
**Symptom:** On a brand-new chat (no conversation ID), the first question shows the user message but no assistant response. The EventStream tab in DevTools shows all SSE events arriving correctly. Asking a second question works normally.

**Root cause:** When the `meta` SSE event arrives with the new conversation ID, `onConversationCreated` fires `router.replace(`/chat/${newId}`)`. In Next.js App Router, this triggers a route navigation from `/chat` to `/chat/[id]`, which unmounts and remounts `ChatPageClient` and `ChatWindow`. The in-progress fetch stream continues in the background but its `setState` calls target the now-unmounted component instance — all tokens are silently discarded.

**Fix:** Replaced `router.replace()` with `window.history.replaceState(null, "", `/chat/${newId}`)`. This updates the browser URL bar without triggering a Next.js navigation, so the component tree stays intact and the stream continues uninterrupted.
