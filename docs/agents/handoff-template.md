# Handoff Template

Use this structure for thread-close updates and PR summaries.

```text
Scope: <issue number(s) targeted>
Changes: <files/modules changed>
Acceptance criteria status: <pass/fail/partial by criterion>
Risks/issues: <blockers, tradeoffs, pending decisions>
Next step: <single smallest actionable next task>
```

## Example

```text
Scope: #42
Changes: Added assertOwnership helper in src/lib/supabase/; applied to chat and summary routes
Acceptance criteria status: Partial - both routes covered; ingestion route not yet migrated
Risks/issues: RLS still bypassed by the admin client (ADR-0002); helper is convention, not enforcement
Next step: Apply assertOwnership to POST /api/upload
```

Historical threads used week/task IDs (`Week 1, W1-004`) instead of issue numbers; those
snapshots live in the frozen files under `docs/archive/`.
