# 0005 — Row-level security is the authorisation boundary

**Status:** Accepted · **Date:** 2026-11-02

## Context

Authorisation is expressed twice: in the client (`src/lib/roleAccess.ts`-style policy, route guards) and in Postgres (380 RLS policies across 93 tables). The client copy is convenience; the database copy is the control. Any request that bypasses the client — a replayed token, a crafted PostgREST call, an edge function on the service role — is decided only by RLS.

At scale, three pressures push teams to weaken this:

- **Performance.** 218 policies call bare `auth.uid()` and 118 call `has_role()` per row (§12.3 limit 5).
- **Token lifetime.** Revocation lags the 1 h JWT default, so a revoked clinician keeps access until refresh.
- **Convenience.** Embedding capabilities in the token avoids the per-row lookup.

## Decision

RLS remains the only authority for data access. The client policy exists to avoid offering actions that will fail, never to permit them.

- **Optimise, do not bypass.** Policies move to `(select auth.uid())` so the call is evaluated once per statement rather than per row, and repeated `has_role()` calls collapse into one capability lookup. The precedent is `20260331174041_optimize_rls_auth_function_calls.sql`, which covered six policies and was never extended.
- **No capability claims in JWTs for clinical actions.** If capabilities are embedded to save lookups, revocation inherits the token lifetime. Either shorten it to ≤ 15 minutes or verify server-side at the moment of action (§12.8). The default 1 h is not acceptable for a revoked clinician.
- **Never serve an authorisation decision from a lagging replica** (§12.4.5).
- **Cache invalidation is a security requirement.** If a cache of permissions is introduced, it must invalidate within 60 s of a role change, and its key must include the clearance scope.
- **Service-role functions are an exception that must be audited.** An edge function acting on the service role bypasses RLS entirely; each one must re-implement the check it removed and be reviewed as such.

## Consequences

**Positive**
- One place where "may this person see this row" is answered. A client bug cannot leak data.
- Defence clearance scoping and tenant isolation are enforced by the same mechanism as everything else.
- Revocation is at least bounded by RLS re-evaluation, even when tokens are still valid.

**Negative**
- Every high-concurrency test must include RLS cost, and RLS bugs are silent (rows disappear rather than erroring).
- Rewriting 218 policies is migration work that must be done in batches and verified per table, not in one push.

**Operational**
- Any policy change needs a test that asserts both directions: the permitted role sees the row, the other role does not.
- Load tests must run as an authenticated user (the script accepts `LOADTEST_TOKEN`), not the service role, or they measure a path no user takes.

## Alternatives rejected

- **Move authorisation into the API layer with the service role.** Removes the database guarantee and requires every new endpoint to remember a check. The failure mode is a full data leak.
- **Embed full capability sets in the JWT with a long TTL.** Fast, and wrong for clinical revocation: a suspended clinician keeps prescribing for an hour.
- **Disable RLS on hot tables and rely on views.** Views do not remove the policy need and add a maintenance surface.

## Revisit trigger

A T1 run where RLS evaluation dominates response time after the `(select auth.uid())` rewrite: then consider a security-definer helper returning all capabilities for the caller in one lookup, still resolved per request, not per token.
