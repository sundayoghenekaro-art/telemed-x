# Architecture decision records

One file per decision that constrains how the platform scales. Each record states the evidence, the decision, what it costs, and the measurement that would reverse it. None of these are permanent.

| ADR | Decision | Status |
|---|---|---|
| [0001](0001-single-region-until-measured.md) | One region and one primary until a measured test demands otherwise | Accepted |
| [0002](0002-postgres-only-system-of-record.md) | Postgres stays the only system of record; no second store without a measured trigger | Accepted |
| [0003](0003-keyset-pagination-and-server-aggregation.md) | Keyset pagination and server-side aggregation on every high-volume read | Accepted, partially implemented |
| [0004](0004-signed-media-delivery.md) | Media bytes bypass the application path; delivery is signed, never public | Accepted, migration pending |
| [0005](0005-rls-authorisation-boundary.md) | Row-level security is the only authorisation authority; no capability claims in tokens | Accepted |
| [0006](0006-bounded-postgres-queue.md) | Asynchronous work runs through a bounded Postgres queue with per-class admission control | Accepted, rate limiting written, queue not built |
| [0007](0007-open-loop-capacity-evidence.md) | Capacity claims require open-loop evidence with recorded environment | Accepted |

**Read with:** [`../architecture/current-state.md`](../architecture/current-state.md) for the diagrams these decisions describe, and `SCALABILITY_AUDIT.md` for the measurements and the readiness statement.

## Format

Every record carries: status and date, context with evidence (file and line where possible), the decision, consequences split into positive / negative / operational, alternatives rejected, and a revisit trigger. A decision without a revisit trigger is a policy, not a decision.
