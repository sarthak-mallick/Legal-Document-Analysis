# CLAUDE.md

Repository-level policy for Claude Code and sub-agents. For any thread in this
repository, agents must apply these rules by default — you do not need to be
told to use these files each time.

## Source of Truth Order

1. `docs/project-spec.md` for product scope, architecture, timeline, and acceptance criteria.
2. `docs/week-N-execution.md` for the active week plan and live status.
3. `docs/agents/workflow.md` for execution workflow and decision rules.
4. `docs/agents/handoff-template.md` for handoff/report format.
5. `CLAUDE.md` for top-level policy.

If there is any conflict:

- Product/timeline conflict: `docs/project-spec.md` wins.
- Week execution conflict: active `docs/week-N-execution.md` wins.

## Mandatory Rules

- Clarification before assumption:
  Ask the user before making any assumption that could affect scope, architecture, timeline, cost, security, environment, or data contracts.
- Scope discipline:
  Execute only the requested week/milestone scope unless the user explicitly approves scope expansion.
- Weekly status discipline:
  Keep exactly one execution file per active week (`docs/week-1-execution.md`, `docs/week-2-execution.md`, etc.).
  Update that file's live status sections before closing a thread.
- Workflow authority discipline:
  Treat `docs/agents/workflow.md` as the canonical location for execution-level rules (task sequencing and batching preferences, code observability, README/runbook maintenance, current E2E runner maintenance, and context hygiene).
  Avoid duplicating those detailed rules here.

## Thread Start Reference

Use the thread-start checklist and minimal-read mode from `docs/agents/workflow.md` as the canonical process.

## Change Management

- If product scope/timeline changes, update `docs/project-spec.md` change log.
- If workflow/handoff behavior changes, update `docs/agents/workflow.md` and/or `docs/agents/handoff-template.md`.
- Keep the policy sections above short; only policy belongs there.

## Project

AI-powered legal document analysis platform using RAG + LangGraph agent.

- Full spec: `docs/project-spec.md`
- Tech stack, architecture, features, directory map: `README.md`
- Setup and deployment: `docs/deployment.md`

## Commands

```bash
npm run dev            # Start dev server (Next.js)
npm run build          # Production build
npm run typecheck      # TypeScript check (tsc --noEmit)
npm test               # Run unit tests
npm run test:coverage  # Run tests with coverage report
npm run lint           # Run ESLint
npm run format         # Format code with Prettier
npm run format:check   # Check formatting without writing
```

## Conventions

- Use App Router patterns (server components by default, `"use client"` only when needed)
- Required env vars: `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional env vars: `LLAMA_PARSE_API_KEY` (table extraction), `BRAVE_SEARCH_API_KEY` (web search), `CHUNK_SIZE` / `CHUNK_OVERLAP` (tuning)
- Never commit `.env.local` or secrets
- Embeddings are 768-dimensional vectors (gemini-embedding-001 with outputDimensionality: 768) — if changing embedding provider, update DB column size

## Git

- When committing, always break changes into multiple small, logically grouped commits — never one big commit
- Each commit should focus on one concern (e.g., separate commits for config, bug fixes, features, docs)

## Agent skills

### Issue tracker

GitHub Issues on `sarthak-mallick/Legal-Document-Analysis`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, unchanged (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at the root, ADRs in `docs/adr/`. See `docs/agents/domain.md`.
