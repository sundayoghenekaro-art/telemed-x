# 0002 — Postgres stays the only system of record

**Status:** Accepted · **Date:** 2026-11-02

## Context

The data access audit found 328 `.from()` calls across 84 files, of which 23 use `.limit()` or `.range()` (§12.3 limit 3). The instinctive response to "this will not scale" is to add infrastructure: a search cluster, a document store for records, a separate analytics warehouse.

None of the observed problems are storage-engine problems. They are query-shape problems: unbounded selects, aggregation in JavaScript, RLS re-evaluated per row, and a whole-population vitals scan reduced in the browser. Each of those is wrong against any database.

## Decision

Keep one Postgres primary as the system of record for clinical, financial, and identity data. Add no second database, search engine, or cache until a measured workload shows Postgres cannot meet the agreed SLO after query and index work.

Permitted exceptions, each with an explicit trigger:

| Component | Trigger to add it | What it must not hold |
|---|---|---|
| Read replica for reporting | Analytics queries measurably slow clinical reads (§12.4.8) | Authorisation decisions |
| Object storage (already present) | Media bytes | Access policy or audit — those stay in Postgres |
| Cache | A measured hot path, invalidated on permission change within 60 s | Anything a stale read could make unsafe (§12.8) |

## Consequences

**Positive**
- One place where a clinical fact is true. No dual-write, no reconciliation, no "which store is authoritative" incident.
- Transactions keep their meaning: a prescription and its audit row commit together.
- Operational surface stays small enough for the present team.

**Negative**
- Analytics compete with clinical traffic until a replica exists. That is an accepted, documented risk with a threshold in §12.12.3.
- Scaling a single primary is vertical or by partitioning. Both are finite, and both are cheaper than the wrong data model.

**Operational**
- Partitioning (`patient_vitals`, messages, audit) is the first structural change, not a new database.
- Every proposed index must be `CREATE INDEX CONCURRENTLY` outside a transaction (§12.4.6).

## Alternatives rejected

- **Introduce an Elasticsearch/OpenSearch cluster for search.** No measured search latency problem exists; the client fetches whole tables and filters in memory. Fixing that removes the demand.
- **Move clinical records to a document store.** Loses cross-record transactions, which clinical workflows rely on (medication plus allergy check plus audit).
- **Cache aggressively in the client.** react-query is mounted but barely used (`src/App.tsx:83`). Adding caching on top of an unbounded query hides the cost rather than removing it, and creates a permission-staleness risk in a clinical UI.

## Revisit trigger

A T1/T2 run where p95 clinical read exceeds 300 ms at under 50% CPU: that points at query shape, so index and rewrite first. Only a run that shows CPU-bound saturation at acceptable latency justifies new storage.
