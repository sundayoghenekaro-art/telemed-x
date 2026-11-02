# 0003 — Keyset pagination and server-side aggregation on every high-volume read

**Status:** Accepted, partially implemented · **Date:** 2026-11-02

## Context

Two patterns dominate the client's data access:

1. **Unbounded selects.** 328 `.from()` calls, 23 bounded. Several fetch entire tables and filter in JavaScript — the worst being `RemotePatientMonitoring.tsx:100`, which pulls 500 unfiltered vitals rows to derive one latest reading per patient.
2. **Offset pagination.** Where pagination exists it uses `.range()` with an offset, which degrades linearly and duplicates rows when new data arrives during a scan.

At the modelled peak of 25,500 reads/s (§12.1.2), one unbounded call per client is a denial-of-service against the primary.

## Decision

Every high-volume read is bounded and ordered by a stable key.

- **Keyset pagination** on `(created_at DESC, id DESC)` via PostgREST's compound predicate, implemented once in `src/lib/pagination.ts` (`pageCursor`, `afterCursor`, `hasNextPage`). Page size 25 by default, hard maximum 200.
- **Aggregation happens in the database.** "Latest reading per patient" is `latest_patient_vitals()`, a `distinct on` RPC shipped in `20261101160000_scalability_indexes_and_rate_limits.sql`. PostgREST cannot `GROUP BY`, so any aggregate that is not a single-row count needs an RPC.
- **Charts get a bounded window with an honest label.** `VITALS_SERIES_LIMIT = 2000`; when a 30-day window is truncated the UI says so instead of silently plotting a subset.
- **Counts use `head: true`.** Unread message counts are one cheap count per channel, because a grouped count requires an RPC that does not exist yet.

## Consequences

**Positive**
- Read cost is a function of page size, not table size. A table can grow by three orders of magnitude without a query changing shape.
- No duplicate or skipped rows during concurrent writes.
- The UI is honest about truncation, which matters when a clinician is reading a vitals trend.

**Negative**
- Cursor state must be threaded through components; `afterCursor` needs both columns present or it throws.
- Deep "jump to page 40" navigation is not supported. No screen needs it.
- One extra RPC to maintain when `latest_patient_vitals()` changes.

**Operational**
- Any new list view must use the helper. A reviewer should reject `.select('*')` without a `.limit()` on a user-facing list.
- The RPC depends on an index on `patient_vitals (patient_user_id, recorded_at DESC)`; the migration that ships it also ships the index.

## Alternatives rejected

- **`OFFSET` pagination with a larger page size.** Defers the problem and introduces duplication under concurrent inserts.
- **Fetch once and cache in the client.** Moves the cost and adds permission-staleness risk (§12.8).
- **Materialised view for latest vitals.** Refreshing it is its own scaling problem at 26,700 writes/s; `distinct on` over an index is sufficient until measured otherwise.

## Revisit trigger

A T1 run where p95 on the paginated clinical read exceeds 300 ms with warm cache and correct indexes: then consider covering indexes before considering materialisation.
