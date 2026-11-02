# 0001 — One region, one primary, until measurement demands otherwise

**Status:** Accepted · **Date:** 2026-11-02 · **Supersedes:** none

## Context

The platform runs in a single Supabase region (`eu-north-1`) on a single Postgres primary, free plan, no replica, no standby, no PITR configuration (`SCALABILITY_AUDIT.md` §12.3 limit 9, §12.7.1). The stated goal is 100 million users, which invites an immediate move to multi-region active-active.

The capacity model (§12.1) projects 30,000 req/s at single-region peak. Nothing in the repository demonstrates that one region cannot serve that load. What is demonstrated is that the application will not: 55–65 unbounded list reads, whole-population vitals scans, and unfiltered realtime subscriptions break long before any regional capacity ceiling is reached.

Multi-region does not fix those. It multiplies their cost.

## Decision

Keep one region and one primary. Spend the next engineering cycle on bounding queries, indexing, queueing writes, and observing the system. Revisit regional topology only when a measured test shows a single region cannot meet the agreed SLOs.

The prerequisites before any multi-region work are non-negotiable:

1. A T1 baseline run in a seeded environment.
2. Observed p95 latency and error rate under sustained load.
3. Replication lag measured on a replica that actually exists.

## Consequences

**Positive**
- No dual-write, conflict resolution, or cross-region consistency code to build and operate.
- Recovery story stays simple: point-in-time restore of one database.
- The cost of the next step is paid against a measurement, not an assumption.

**Negative**
- A single regional incident is a full outage today, with no standby. This is a known, accepted gap, not an oversight — it is recorded as a blocker in §12.12.1.
- Latency for users far from `eu-north-1` is whatever physics allows; regional cells are the eventual answer (§12.7.3).

**Operational**
- Backups and PITR must be enabled before this decision can be called safe. That remains outstanding.

## Alternatives rejected

- **Active-active across two regions now.** Requires conflict resolution for clinical writes, doubles the surface area for RLS bugs, and addresses a bottleneck the evidence does not show exists. Cost: two clusters plus a routing control plane, before any of the cheap fixes are made.
- **Read replica in a second region for latency.** A replica does not help writes, and the client's problem is query shape, not distance.

## Revisit trigger

A T1/T2 run that meets §12.2 targets within 60% of the single-region capacity ceiling retires this ADR and starts cell design (§12.12.3).
