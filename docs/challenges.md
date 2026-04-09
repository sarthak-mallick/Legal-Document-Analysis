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
