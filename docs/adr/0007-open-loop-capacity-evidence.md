# 0007 — Capacity claims require open-loop evidence

**Status:** Accepted · **Date:** 2026-11-02

## Context

The only executed performance test is a 5-second, 250-request smoke run against a developer laptop's Vite server (§12.9.2). It validates that the test instrument works. It says nothing about capacity.

The failure mode this ADR exists to prevent is extrapolating it. "250 requests with p95 15.7 ms on a laptop" is not a basis for any statement about 100 million users, and a closed-loop generator makes the error worse: when the server slows down, a closed-loop client offers less load, so the run reports healthy latency while the system is actually saturated.

## Decision

Capacity claims require runs from `scripts/loadtest.mjs`, which is deliberately open-loop:

- Fixed arrival rate with drift correction, so slow responses do not reduce offered load and hide overload.
- In-flight cap, with saturation time reported when the cap is hit.
- Per-request p50/p95/p99, status distribution, and byte counts.
- Refuses non-loopback targets without `--allow-remote`, and caps remote runs at 200 rps.
- Tokens supplied via `LOADTEST_TOKEN` in the environment, never on the command line.

Every reported run records target environment size, dataset size, workload mix, duration, and configuration. Scenarios live in `scripts/scenarios/`: `static-shell.json` (instrument check), `t1-read-heavy.json` (weighted clinical reads), `t3-device-ingest.json` (batched vitals writes). The dataset comes from `scripts/staging-seed.sql`, which refuses to run unless `set app.staging_seed = 'yes';` was issued in the same session, so it cannot be fired at production by accident.

Results are classified before they are quoted:

| Class | Meaning |
|---|---|
| **Verified** | Measured in this environment, at this dataset size, in this run |
| **Modelled** | Calculated from stated assumptions |
| **Proposed** | Recommended design, not measured |
| **Blocked** | Cannot be measured with current access |

A run that was blocked stays blocked until it is executed. It does not become "expected to pass".

## Consequences

**Positive**
- The generator cannot be the silent bottleneck in the way a closed-loop tool can.
- Results carry their environment with them, so nobody can quote a laptop number as a platform number.
- The staging seed cannot be aimed at production by mistake.

**Negative**
- Open-loop testing needs an authenticated credential with realistic RLS scope, which is currently the blocking gap.
- Runs that approach realistic load cost money; approval is required first (§12.9.3, ~$400–$1,200 per run).

**Operational**
- Server-side metrics (CPU, connections, replication lag, queue depth) are required to interpret client results. Without them a run tells you what users saw, not why.
- Provider-side throttling must be coordinated before tests that bill third parties, or the test measures the provider's limit rather than ours.

## Alternatives rejected

- **k6 or Artillery.** Both are good tools; a dependency-free generator avoids a runtime dependency in a repository that already has to build an APK, and neither changes the open-loop requirement.
- **Closed-loop load testing with concurrency targets.** Reports the impression of health during saturation.
- **Extrapolating from a smaller run.** Explicitly forbidden by `SCALABILITY_AUDIT.md` §12.0 and §12.9.2; shared bottlenecks do not scale linearly.

## Revisit trigger

If team members adopt a standard tool with the same open-loop semantics and the results are reproducible from the repository, this ADR can be superseded. The classification requirement survives the tool change.
