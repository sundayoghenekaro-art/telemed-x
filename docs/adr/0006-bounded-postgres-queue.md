# 0006 — Asynchronous work runs through a bounded Postgres-backed queue

**Status:** Accepted, rate limiting implemented, queue not built · **Date:** 2026-11-02

## Context

There is no queue. Notification sends run inline in the request (`send-notifications/index.ts:354`), staff invitations loop serially up to 50 (`create-staff-account/index.ts:86-149`), AI streams with no abort controller (`clinical-assistant/index.ts:146`), and Daily.co room creation is not idempotent. Rate limiting is a `Map` in module scope, so the effective limit multiplies by instance count and resets on restart (§12.3 limits 6–7, §12.13 finding 6).

The consequence at scale is not slowness. It is that one notification campaign, one failed provider, or one AI burst consumes the same capacity a clinical write needs.

## Decision

1. **Anything that leaves the request path becomes a job.** Notifications, exports and reports, media post-processing, AI generation, device ingestion batching, search indexing, and non-critical downstream integrations.
2. **The queue is Postgres-backed** — a table with `FOR UPDATE SKIP LOCKED`, bounded depth per class, and a dead-letter table with a replay tool. No new broker until measurements show Postgres cannot keep up.
3. **Classes are separate** so one cannot starve another, each with its own worker concurrency derived from downstream capacity rather than from CPU.
4. **Everything is idempotent on a job id.** Retries use exponential backoff with jitter, capped at five attempts, and only for retryable classes. Consumers must treat duplicate delivery as normal.
5. **Admission control at the edge.** When a class is full, return `429` with `Retry-After`; never accumulate unbounded work. `202 Accepted` with a job id, and the UI distinguishes accepted, queued, persisted, and completed.
6. **Rate limiting moves to Postgres** — `consume_rate_limit()` in `20261101160000_scalability_indexes_and_rate_limits.sql`, keyed by user, tenant, and route, shared across instances. This part is written; the migration is not applied.
7. **An acknowledged clinical write is never dropped.** If the primary is unavailable the write fails loudly and the client retries with the same idempotency key. Offline mobile writes need a durable local queue; that does not exist yet.

## Consequences

**Positive**
- Clinical writes are insulated from campaigns and AI bursts by construction, not by discipline.
- Restarting a function no longer resets the rate limit.
- Failed notifications become visible in a dead-letter table instead of a database of half-sent campaigns.

**Negative**
- The database now serves queue polling as well as clinical traffic. Polling intervals and `SKIP LOCKED` contention must be tuned; this is the first thing to measure if postgres becomes the bottleneck.
- Two-phase state (accepted vs completed) leaks into the UI. Every job-backed screen needs a status surface.
- Idempotency keys require client cooperation on ingest paths.

**Operational**
- A queue needs an owner, an alert on oldest-message age, and a documented replay procedure. Those are operational commitments, not code.
- `consume_rate_limit()` fails open when the database is unreachable. That is a deliberate choice: a limiter that fails closed turns a database blip into a full outage.

## Alternatives rejected

- **SQS / Redis / RabbitMQ now.** Correct at much larger scale, but adds a provider, a credential, a failure mode, and a cost before any of the cheap fixes are in place. The trigger to switch is sustained queue latency that Postgres cannot meet.
- **In-process `Map` rate limiting with more instances.** The limit is per instance, so the real limit is unbounded; this is what we are removing.
- **Fire-and-forget `invoke()` from the client.** No delivery guarantee, no retry, no visibility.

## Revisit trigger

Oldest queued message above 60 s, or queue polling measurably competing with clinical reads (§12.12.3): then move the queue to a dedicated broker with the same class and idempotency contract.
