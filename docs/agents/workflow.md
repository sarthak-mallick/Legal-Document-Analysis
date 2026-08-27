# Agent Workflow

Operational workflow for implementation threads in this repository.

## 0) Unit of Work

The 8-week build plan closed on 2026-03-26. Weeks 1-8 are **frozen history** in
`docs/archive/` — read them for background, never update them, and do not create a
week 9 file. `docs/project-spec.md` still describes a Week 9 scope; any of it that is
still outstanding belongs in the issue tracker, not in a new execution file.

New work is tracked as **GitHub issues**. See `docs/agents/issue-tracker.md` for the
`gh` conventions and `docs/agents/triage-labels.md` for the label vocabulary.

## 1) Thread Start Checklist

1. Follow the source-of-truth read order in `CLAUDE.md`.
2. Confirm scope: the issue being worked and its acceptance criteria.
3. If any critical detail is unclear, ask clarification questions before implementation.

Use minimal-read mode when reading an issue:

1. Title and body
2. Labels (current triage state)
3. Latest comments only — not the full thread
4. Linked issues/PRs only when the current task depends on them

Apply the same minimal-read discipline to the frozen files in `docs/archive/` when
consulting them for history: `Objective`, `In Scope` / `Out of Scope`, and
`Handoff Snapshot` first; the rest only if needed.

## 2) Clarification Triggers (Ask First)

Ask the user before proceeding when any of these are ambiguous:

- Contract details (schema fields, queue/topic names, API behavior).
- Implementation direction with meaningful tradeoffs.
- Changes to acceptance criteria, task ordering, or timeline.
- New external service/dependency, cost, security, or infra impact.

Question style:

- Keep questions short and decision-focused.
- Offer options when helpful.
- Wait for answer before assuming.

## 3) Execution Rules

- Stay within the scope of the issue being worked.
- Use the issue itself as the live source for status — labels and comments.
- Do not create separate status files unless requested.
- Keep changes incremental and tied to a specific issue number.
- Batching is allowed by default when it improves delivery speed (for example, closing several small related issues in one pass).
- Pause between issues only when the user explicitly asks for step-by-step review checkpoints.
- Code comments/logging rule: every new or modified function must include a short purpose comment and meaningful logging for key transitions and error paths (avoid noisy per-line logs).

## 4) Issue Status Update Rules

During execution, keep the issue current:

- Apply the triage label that reflects its state (`docs/agents/triage-labels.md`).
- Comment when a task blocks, changes direction, or completes.
- Close with a comment summarising the outcome.

Update points:

- When work starts (claim it: `gh issue edit <n> --add-assignee @me`).
- When the task completes, fails, or blocks.
- Before thread close.

Status entry style:

- Keep comments short and factual (1-2 lines).
- Prefer issue number and outcome over long narrative.
- Don't paste long command output into a comment; link the commit or PR instead.

## 5) End-of-Thread Checklist

1. Verify/report acceptance criteria progress.
2. Record blockers/risks and unresolved decisions on the issue.
3. Set next smallest actionable task.
4. Use `docs/agents/handoff-template.md` format in the final summary and in the closing
   issue comment or PR description.

## 6) Decision Records

When a thread settles an architectural decision — a library choice, a security boundary,
a tradeoff with lasting consequences — record it as an ADR in `docs/adr/`, numbered
sequentially. Keep the debugging detail (symptom, root cause, what didn't work) in
`docs/challenges.md` and link the two.

If your work contradicts an existing ADR, surface it explicitly rather than silently
overriding it. See `docs/agents/domain.md`.

## 7) Context Hygiene (Automatic)

Agents must keep context size controlled without user prompting:

1. Do not reread long docs on every turn; reread only the sections needed for the current task.
2. Keep issue comments concise; avoid pasting long command output or long prose.
3. Prefer the issue body and latest comments over reading the full thread history.
4. Do not expand `docs/challenges.md` or the ADRs indefinitely — if additional detail is
   ever required, rely on git history.

## 8) Documentation Maintenance

- `README.md` is the product-facing document: features, architecture, tech stack,
  directory map. Keep it accurate when those change.
- `docs/deployment.md` holds setup and deployment instructions. Runbook steps belong
  there, not in `README.md`.
- `CLAUDE.md` holds only policy and agent-actionable conventions. Descriptive material
  belongs in `README.md`.

## 9) Current E2E Runner Maintenance Rule

Maintain `scripts/run-current-e2e.sh` as the single canonical executable validation flow:

1. Keep it aligned with current behavior and checks.
2. When the validated flow changes, update this script and remove superseded logic from
   the canonical path.
3. Keep documented commands aligned to `scripts/run-current-e2e.sh`.
