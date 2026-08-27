# ADR-0002: Application-level ownership checks are the access-control boundary, not RLS

**Status:** Accepted
**Date:** 2026-06-30

## Context

Every API route in this project uses the Supabase **service-role admin client**
(`createSupabaseAdminClient`). That client **bypasses Row-Level Security entirely**.
Row-Level Security policies exist in the database, but for these routes they are never
the enforcement boundary.

This was discovered as a live vulnerability during a whole-repo code review: three
routes were missing application-level `user_id` filters, so a caller could read,
summarise, and chat over **other users' documents** and inject messages into other
users' conversations simply by passing someone else's UUID.

- `POST /api/chat` fetched documents with `.in("id", documentIds)` and never filtered
  by `user_id`; the agent then answered over chunks the caller did not own.
- `POST /api/chat` accepted an existing `conversationId` without verifying ownership.
- `POST /api/summary/[documentId]` fetched the document with no `user_id` filter — while
  the **GET** in the same file did have one. That asymmetry was the giveaway.

## Decision

Keep the service-role client, and treat **explicit `user_id` filtering in the route
handler** as the access-control boundary. Every query that reads or mutates user-scoped
data must carry an explicit `user_id` filter.

Concretely:

- Chat: fetch documents scoped with `.eq("user_id", userId)` up front and reject the
  request if the owned count ≠ the requested count.
- Chat: verify conversation ownership with `.eq("id", conversationId).eq("user_id", userId)`
  before any write.
- Summary POST: `.eq("user_id", userId)` on the document fetch, matching the GET.

## Consequences

- **RLS is not a safety net here — it is off.** Anyone reading this code must not assume
  the database will catch a missing filter. A forgotten `.eq("user_id", …)` is a
  vulnerability, not a performance bug.
- Any two handlers in one file that diverge on filtering (GET filters by user, POST
  does not) should be treated as a bug until proven otherwise.
- **Known gap:** this is enforced per-route by convention. A shared `assertOwnership`
  helper would make it structurally hard to forget; it does not exist yet.

## Alternatives considered

**Switch the routes to the anon/user-scoped client and let RLS enforce ownership.**
Rejected for now: ingestion and summary paths perform writes that the current policies
do not permit, so this would be a larger change than the fix required. It remains the
structurally safer option if access control keeps causing bugs.
