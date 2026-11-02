# Section 12 — Architecture and Capacity for More Than 100 Million Users

**System:** Trika Health / Telemed-X (React 18 + Vite front end, Supabase backend, Capacitor Android client)
**Audit date:** 2026-11-01
**Extends:** `SECURITY_RECOMMENDATIONS.md` and `SECURITY_FIXES_APPLIED.md`
**Evidence base:** 52 migration files, 11 edge functions, 328 client database calls, production build output, one local instrument smoke test. No production traffic data, no staging environment, no historical metrics.

---

## 12.0 Verdict and method

**The platform is not ready for 100 million users, and this audit does not claim otherwise.** It is a single-region Supabase deployment on the free plan, with no production data, no observability, no load tests, no backup drill, and several client paths that fetch unbounded result sets. Those are not tuning problems; they are missing foundations.

What this section provides:

| Category | Meaning | Where |
|---|---|---|
| **Verified** | Measured or counted directly from the repository or a run | §12.1, §12.9 |
| **Modelled** | Calculated from stated assumptions, not observed | §12.1, §12.7 |
| **Proposed** | Recommended design, not implemented | §12.2–§12.10, `docs/adr/` |
| **Blocked** | Cannot be measured with current access or data | §12.9, §12.12 |

No number in this document should be treated as a capacity result. The only executed test was a 5-second, 250-request smoke run against a developer laptop's Vite server, used to validate the test instrument itself.

Architecture diagrams: `docs/architecture/current-state.md`. Decision records for every proposed component: `docs/adr/` (seven ADRs, each with a cost and a revisit trigger).

---

## 12.1 A. Workload model

### 12.1.1 Population and engagement assumptions

| ID | Assumption | Value | Basis |
|---|---|---|---|
| A1 | Registered users | 100,000,000 | Stated product goal |
| A2 | Monthly active | 35,000,000 (35% of registered) | Consumer-health benchmark, unvalidated |
| A3 | Patient DAU / clinical-staff DAU / admin DAU | 7.0M / 1.2M / 0.2M = **8.4M** | 20% of MAU patients; 30% of 4M clinical staff |
| A4 | Requests per user per day | patient 12, staff 400, admin 60 | Staff ≈ 50 requests/hour over an 8-hour shift |
| A5 | Daily requests | 84M + 480M + 12M = **576M** | A3 × A4 |
| A6 | Average request rate | 576M ÷ 86,400 = **6,667 req/s** | |
| A7 | Peak factor, single region | **4.5×** → 30,000 req/s | See 12.1.3 |
| A8 | Peak factor, globally balanced | 3.0× → 20,000 req/s | Diurnal smoothing across regions |
| A9 | Read:write ratio | 85:15 → 25,500 reads/s, 4,500 writes/s at single-region peak | Clinical systems are read-heavy |
| A10 | Mean response time (target) | 300 ms | §12.2 |
| A11 | In-flight requests at peak | 30,000 × 0.30 s = **9,000** | Little's Law |

**Sessions are not requests.** At peak, roughly 5.04M DAU sessions start within a 6-hour window (233 starts/s); with an 8-minute mean session that is **112,000 concurrent sessions** but only **9,000 requests actually executing**. Conflating the two inflates capacity plans by an order of magnitude.

### 12.1.2 Workload models, one per major flow

| Workload | Volume model | Average | Peak (factor) | Dominant cost |
|---|---|---|---|---|
| Authentication / recovery | 5.04M sign-ins per peak window | 233 sessions/s | 700/s (3×) | GoTrue CPU, SMS |
| Clinical record reads | 85% of 576M | 5,667/s | 25,500/s | DB reads, RLS evaluation |
| Clinical writes (notes, orders, results) | 15% of 576M | 1,000/s | 4,500/s | DB writes, audit rows |
| Appointments / referrals / prescriptions | 8% of writes | 80/s | 360/s | Transactional integrity |
| Medical images | 500k studies/year × 200 MB = **100 TB/yr** | 0.016 studies/s | 5× during clinic hours | Object storage, egress |
| Documents | 25M encounters/yr × 2 × 1.2 MB = **60 TB/yr** | — | — | Storage, signed URL issuance |
| Video learning / broadcasts | 500k viewing-hours/day; 84k concurrent (1% of DAU) at 2.5 Mbps = **210 Gbps** | 24M viewer-seconds/s | Broadcast spike: +50k viewers in 60 s | CDN egress |
| Notifications / messaging | 48M staff messages/day; 5% of MAU receive 2 SMS/month | 556 msg/s | 2,200/s (4×) | Realtime fan-out, SMS |
| AI inference | 10% of DAU × 1 request/day = 840k/day | 9.7/s | 44/s (4.5×); 132 in flight at 3 s | Provider tokens, concurrency |
| Device ingestion (RPM) | 2M monitored patients × 288 readings/day = **576M/day** | 6,667/s | **26,700/s** (4×) | DB writes, realtime fan-out |
| Search / reporting / analytics | 5% of staff requests = 24M/day | 278/s | 1,250/s | Scans, export workers |
| Offline device resync | Assumed 2% of DAU reconnect within 10 min after a regional outage | — | 168k sessions × 40 pending writes / 600 s = **11,200 writes/s** | Burst absorption, idempotency |

**Device ingestion exceeds human traffic.** At peak, RPM writes (26,700/s) plus clinical writes (4,500/s) ≈ **31,000 writes/s**. That is the single hardest number in this model, and it is well beyond a single Postgres primary with per-row RLS and 90 indexes.

### 12.1.3 Peak-factor justification

- 55% of a single region's daily activity falls into 08:00–14:00 local (healthcare rounds, clinic opening).
- Diurnal math: `24 h ÷ 8 peak hours × 1.15 intra-hour burst ≈ 3.45`.
- Clinical morning rounds add 1.3× → **4.5×** for a single-region deployment.
- A globally distributed user base with regional cells reduces this to ~3.0× because peaks no longer overlap.

These factors are assumptions, not measurements. Replace them with observed arrival curves before any capacity commitment.

### 12.1.4 Geographic and behavioural distribution

- Single region today: `eu-north-1` (Stockholm), inferred from `supabase/.temp/pooler-url`.
- Defence use implies jurisdiction constraints that may prohibit serving some populations from a single EU region (§12.6).
- Payload sizes: clinical JSON responses 2–40 KB; FHIR bundles up to 5 MB; thumbnails 30 KB; video segments 2–6 MB; DICOM 20–500 MB.
- Retention: audit events 7 years (defence migration `20261101120000_defence_learning_hub.sql:1103`); progress events stated as pruned at 24 months with **no job implementing it**; medical records indefinite.

---

## 12.2 B. Performance and reliability targets (proposed)

These are proposals to be agreed, not current behaviour.

| Workflow | Availability | p50 | p95 | p99 | Error budget | Consistency requirement | RTO / RPO |
|---|---|---|---|---|---|---|---|
| Sign-in / token refresh | 99.95% | 300 ms | 800 ms | 2 s | 0.05% | Revocation effective ≤ 60 s | 15 min / 0 |
| Clinical record read | 99.95% | 120 ms | 300 ms | 1 s | 0.05% | Read-your-writes for own edits; ≤ 2 s staleness elsewhere | 15 min / 5 min |
| Clinical write (prescription, result ack, order) | 99.95% | 150 ms | 500 ms | 1.5 s | 0.05% | Durable before acknowledgement; never silently dropped | 15 min / 5 min |
| Vitals / device ingest | 99.9% | 100 ms | 400 ms | 2 s | 0.1% | At-least-once with idempotency key | 30 min / 5 min |
| Notification delivery | 99.9% accept | queue ack 200 ms | delivery 60 s | 5 min | 0.1% | At-least-once; duplicate suppression | 30 min / 0 |
| Video start (learning) | 99.9% | TTFB 300 ms | 800 ms | 2 s | 0.1% | — | 1 h / 0 |
| AI answer | 99.0% | 1.5 s | 4 s | 10 s | 1% | Refusal is a valid success | 1 h / 0 |
| Report / export | 99.5% | ack 1 s | completion 5 min | 15 min | 0.5% | Accepted ≠ completed must be visible | 1 h / 0 |
| Audit event write | 99.99% | 50 ms | 200 ms | 1 s | 0.01% | Append-only, no sampling | 15 min / 0 |
| Realtime delivery | 99.9% | 300 ms | 2 s | 5 s | 0.1% | Ordering per conversation only | 1 h / 0 |

**Error budget:** 0.05% availability over 30 days = **21.6 minutes**. Release freeze when burn rate exceeds 2× in one hour.

**Headroom policy:** operate at ≤ 60% of the tested breaking point; every critical path must survive the loss of one availability zone and one read replica at peak. Scale before 70% sustained saturation, not after.

**Degradation order** (shed first → shed last): analytics and media generation → report exports → AI inference → non-urgent notifications → messaging enrichment → directory/search → **clinical reads and writes last**. Nothing in the shed list may be a required clinical function.

**Low-bandwidth experience:** measure the complete path on a 1 Mbps / 400 ms RTT profile. The production entry chunk is 607 kB JS (173 kB gzip) plus 160 kB CSS (`dist/assets/index-BSFiqTOk.js`, `index-DAy_bJo6.css`) — above Vite's 500 kB warning threshold. At 1 Mbps that is ≈ 6 s before first paint, before any route chunk. That is the current baseline for a rural facility.

---

## 12.3 C. Architectural scaling limits

Ordered by what breaks first, with evidence.

| # | Limit | Evidence | Breaks at (estimate) | Severity |
|---|---|---|---|---|
| 1 | **Device write throughput on one primary** — `patient_vitals` is unpartitioned, indexed, RLS-filtered, and published to realtime | `20260221145003_*.sql:52,77`; `20260222101104_*.sql:160` | ~1–3k writes/s | Critical |
| 2 | **Realtime fan-out** — `telemedicine_sessions` subscribes with `event:'*'` to every connected client; staff messaging fan-out is now membership-filtered | `src/components/telemedicine/TelemedicineConsole.tsx:205`; `src/hooks/useStaffMessaging.ts` (§12.13 finding 4) | Fan-out = messages/s × connected clients; 2.2k/s × 3k clients = 6.6M deliveries/s | Critical |
| 3 | **Unbounded reads** — 328 `.from()` calls across 84 files, only 23 `.limit()`/`.range()`; RPM now uses `latest_patient_vitals()` (unapplied), several other lists remain unbounded | `src/hooks/useRadiologyPersistence.ts:60`; `src/hooks/useAuditLog.ts:37`; §12.13 findings 3 and 4 | First 100k-row table | Critical |
| 4 | **N+1 messaging queries** — channel previews now load in one batched query; unread counts and a few detail paths still issue per-row requests | `src/hooks/useStaffMessaging.ts` (§12.13 finding 4) | ~50 channels or ~20 msg/s per client | High |
| 5 | **RLS evaluation cost** — 380 policies; 218 use bare `auth.uid()` per row; 118 `has_role()` calls; Defence policies call capability functions per row | `20260221145003_*.sql:20`; `20261030150000_*.sql:31`; `20261101120000_*.sql:444-502,689-698` | ~5k rows scanned per request | High |
| 6 | **Rate limiting** — Postgres-backed fixed window written for all three functions; **not active until `20261101160000` is applied** | `supabase/functions/_shared/rateLimit.ts`; §12.13 finding 6 | Limit resets to per-instance behaviour until the migration lands | High |
| 7 | **No queue or backpressure** — notification sends, staff invites, media work all run inline in a request | `send-notifications/index.ts:354`; `create-staff-account/index.ts:86-149` | One campaign starves everything | High |
| 8 | **Media path** — delivery is now signed and uploads are honest about being unprocessed; still no resumable upload, CDN, transcode, or scanner | `src/lib/storage.ts`; `PublishingView.tsx`; §12.13 findings 1–2 | Any real media volume | High |
| 9 | **Single region, free plan, no PITR, no DR** | `supabase/.temp/pooler-url`; no backup config anywhere | First regional incident | Critical (availability) |
| 10 | **No client cache** — react-query mounted but used only for three external APIs; every tab mount re-queries | `src/App.tsx:83`; `useFhir.ts`, `useOpenFDA.ts`, `useRxNorm.ts` only | Multiplies DB load by navigation rate | Medium |
| 11 | **Analytics on OLTP** — dashboards query the transactional tables directly | `RevenueDashboard.tsx`, `RadiologyDashboard.tsx`, `LabDashboard.tsx` | Report load competes with clinical reads | Medium |
| 12 | **AI gateway** — dev middleware still exists under `vite dev`; the production edge function is written but **not deployed** | `vite.config.ts:122`; `supabase/functions/defence-ai/index.ts` | Production 404 on first use until deployed | High (functional) |

**What is not the bottleneck:** the React front end itself. 30 routes are lazy-loaded (`src/App.tsx:25-54`), and static asset delivery is cheap to scale. The constraint is data access shape, not rendering.

**Recommendation:** fix 1–8 before considering microservices, Kubernetes, multiple databases, or active-active regions. None of those fixes an unbounded `select *`.

---

## 12.4 D. Database and data architecture

### 12.4.1 Current state

- 93 public tables (71 core + 22 `defence_learning_*`), 90 index statements, 380 policies.
- 52 migration files in the repo; all 52 applied to `ypcziwlehjbmqohrsvzo` on 2026-11-02 (the Defence hub and Phase 0 scalability migrations were pushed together, Defence hub first).
- No partitioning, no `pg_cron`, no retention job, no `statement_timeout`, no `pg_stat_statements`, no connection-pool configuration in the repo.

### 12.4.2 Index gaps (add before any load test)

| Table | Missing index | Why |
|---|---|---|
| `patient_notifications` | `(patient_user_id, created_at DESC)` | RLS predicate column is unindexed (`20260221135750_*.sql:201`) |
| `patient_medical_records` | `(patient_user_id, created_at DESC)` | Policy filters on `patient_user_id`, zero indexes |
| `patient_medications` | `(patient_user_id)` | Same |
| `mood_entries`, `patient_meals`, `patient_exercises` | `(user_id, entry_date DESC)` | Realtime tables, no indexes |
| `care_plan_tasks` | `(care_plan_id)` | FK unindexed |
| `defense_medical_records` | `(attending_staff_id)` | FK unindexed |

### 12.4.3 Query patterns to change

1. **Cursor pagination everywhere.** Replace offset pagination and unbounded selects with `(created_at, id)` keysets and a hard page size (50 default, 200 max).
2. **Aggregate on the server.** RPM's "latest reading per patient" must be a `DISTINCT ON`/window query or a materialised latest-reading table, not 500 rows ranked in JavaScript.
3. **Prepare statements, not per-request RLS.** 218 policies calling bare `auth.uid()` are re-evaluated per row; the fix applied in `20260331174041_optimize_rls_auth_function_calls.sql` covered 6 policies on 4 tables and was never extended. Wrap in `(select auth.uid())` and replace repeated `has_role()` calls with one capability lookup per statement.
4. **Batch the messaging reads.** One query per channel list with a lateral join, not 2N round trips.

### 12.4.4 Partitioning and retention

| Table | Partition key | Retention (hot → archive) |
|---|---|---|
| `patient_vitals` | monthly by `recorded_at` | 24 months → object storage, keep hourly rollups |
| `session_messages`, `staff_messages`, `ai_chat_messages` | monthly | 24 months → archive |
| `allergy_override_audit_log`, `consent_audit_log`, `defence_learning_audit_events` | monthly | 7 years, immutable (WORM), never pruned |
| `wallet_transactions` | monthly | 7 years (financial) |
| `defence_learning_progress_events` | monthly | 24 months as documented, **implement the job** |

Deletion must be `DROP PARTITION`, not `DELETE`; deleting millions of rows creates bloat, WAL spikes, and lock contention.

### 12.4.5 Replicas and consistency

- Read replicas for directories, reporting, search, and analytics: acceptable with bounded lag.
- **Never** serve an authorisation decision from a lagging replica. RLS runs on the primary or a replica guaranteed to be within the permission-change propagation window.
- Clinical read-after-write (a clinician saving a note then viewing it) must stick to the primary for ~2 s or use a session-scoped read-your-writes token.
- Replication delay SLO: ≤ 2 s p95; alert at 5 s.

### 12.4.6 Migrations at size

The cutover replayed 48 migrations in a single `db push`. That is not viable once tables hold hundreds of millions of rows. Requirements:

- Expand/contract only: add nullable column → backfill in batches → dual-write → switch reads → drop.
- `lock_timeout` and `statement_timeout` on every DDL statement.
- No index creation without `CONCURRENTLY`.
- Backfills batched at ≤ 10k rows per transaction with progress tracking.
- Every migration needs a tested rollback or a forward-fix plan; the repo currently has neither.

### 12.4.7 Correctness under distribution

- Idempotency keys for vitals ingest, payments, and prescription issue (client-generated UUID, unique constraint, replay returns the original result).
- Transactional outbox for notifications and audit export — never fire an email inside the write transaction.
- Test duplicate, delayed, missing, and out-of-order events explicitly. Do not assume exactly-once delivery to Resend, Daily.co, or OpenAI.
- Financial and clinical state changes need serialisable transactions or explicit row locks; the wallet is a single row per patient (`patient_wallets.patient_user_id UNIQUE`) and will be a hot-row contention point during campaigns.

### 12.4.8 Analytics isolation

Move reporting off the OLTP primary: a dedicated replica or a warehouse fed by CDC. Today `RevenueDashboard`, `LabDashboard`, and `RadiologyDashboard` issue aggregate queries against production tables.

---

## 12.5 E. Media, imaging, and large-file delivery

### 12.5.1 Current state

| Aspect | Status | Evidence |
|---|---|---|
| Object storage | 3 buckets, all private | `20260221145003_*.sql:80`; `20260222100747`; `20261101120000:1085` |
| Upload path | Browser → Supabase Storage directly; no size/mime gate on `medical-records` | `MedicalRecordsTab.tsx:78` |
| Resumable / multipart | None | No TUS, `uploadToSignedUrl`, or chunking anywhere |
| Delivery | `getPublicUrl` used for PHI, which cannot work on a private bucket and would leak if it did | `MedicalRecordsTab.tsx:80` |
| Transcoding / thumbnails | None; Defence pipeline is `setTimeout` animation | `PublishingView.tsx:590-630` |
| Malware scanning | None; result is a hardcoded audit string | `PublishingView.tsx:624-629` |
| CDN | None; no cache-control strategy | repo-wide |
| Lifecycle rules | None | repo-wide |

The Defence "malware scan clean; transcode complete" audit entry is fabricated. In a clinical system, that string is a safety statement; it must not exist until a scanner actually returns.

### 12.5.2 Target architecture

1. **Direct-to-storage resumable uploads** (TUS or multipart) with a short-lived signed upload URL issued by an authenticated endpoint that validates size, mime, and quota before the upload starts.
2. **Asynchronous post-processing** on upload completion: virus scan → transcode to H.264/AAC + HLS ladder → thumbnails → text extraction → index. Nothing is downloadable until scan passes.
3. **Signed delivery only.** Short-lived signed URLs (≤ 15 min) or signed cookies; never public bucket URLs for PHI.
4. **CDN with per-tenant cache namespaces.** Cache key must include tenant/clearance context; a shared cache keyed only on object path will leak restricted content after a permission change.
5. **Lifecycle policy**: video 24 months hot then archive; documents per statutory retention; deletions propagate to CDN within the revocation window.
6. **Separate metadata from bytes.** Access policy and audit live with the authoritative record, not the object.

### 12.5.3 Sizing

- Concurrent viewers at peak: 84,000 × 2.5 Mbps = **210 Gbps**; at AV1 (1.2 Mbps) ≈ 101 Gbps.
- Daily video egress at 500k viewing-hours: 500,000 × 1.125 GB = **562 TB/day**.
- Monthly egress: ≈ 16.9 PB; at $0.008–0.02/GB that is **$135k–$337k/month** before committed-use discounts.
- Storage growth: 100 TB/yr imaging + 60 TB/yr documents + ~50 TB video library.

### 12.5.4 Required test

One headquarters announcement to 1M staff within a one-hour window: measure origin egress, CDN hit ratio (> 95% expected), token issuance rate, and p95 start time. This test is **blocked** — no CDN, no seeded media, no staging environment.

---

## 12.6 F. Asynchronous work and overload protection

### 12.6.1 Current state

There is no queue. Notifications, staff invitations, AI calls, and (simulated) media processing all execute inside a request or an animation. Edge functions have no timeouts, no retries, no dead-letter path, and no idempotency keys:

- `send-notifications` sends inline (`index.ts:354`).
- `create-staff-account` loops up to 50 invitations serially (`index.ts:86-149`).
- `clinical-assistant` streams from OpenAI with no abort controller (`index.ts:146`).
- `daily-video` creates and deletes Daily.co rooms non-idempotently.

### 12.6.2 Required design

| Concern | Requirement |
|---|---|
| Queue classes | notifications, media processing, AI generation, exports, device ingest, search indexing — separate queues so one cannot starve another |
| Bounded concurrency | per-queue worker limits derived from downstream capacity, not CPU |
| Backpressure | reject with `429` + `Retry-After` at the edge; never accumulate unbounded work |
| Retries | exponential backoff with jitter, max 5 attempts, only for retryable classes |
| Dead letters | every queue has a DLQ with replay tooling and an owner |
| Idempotency | every consumer is idempotent on message id; producers carry idempotency keys |
| Fairness | per-tenant quotas; one hospital's campaign cannot consume the fleet |
| Circuit breakers | open on downstream error rate > 50% for 30 s; fail fast, do not queue indefinitely |
| Accepted ≠ completed | API returns `202` with a job id; UI distinguishes accepted, queued, persisted, completed |

**Never discard an acknowledged clinical write.** If the primary is unavailable, the write returns an error and the client retries with the same idempotency key. Offline mobile writes go to a durable local queue (currently absent) and reconcile on reconnect.

### 12.6.3 Degradation

When the queue depth exceeds its bound: pause media processing and analytics exports first, keep notification delivery for critical alerts, keep clinical writes untouched. AI is optional by definition and sheds first.

---

## 12.7 G. Multi-region resilience and data residency

### 12.7.1 Current state

Single region `eu-north-1`, single primary, no standby, no failover procedure, no DR exercise, no PITR configuration. Region is not recorded in `supabase/config.toml`; it exists only in `.temp/pooler-url`.

### 12.7.2 Residency constraints

- Health data processed for EU patients stays in the EU.
- Defence health data may carry stricter handling rules than civilian data; the learning hub already scopes by clearance and branch.
- **Do not move restricted health or defence data across jurisdictions to improve latency.** Latency is solved with regional cells, not by replicating restricted data.

### 12.7.3 Regional cells (proposed, not justified yet)

A cell is an independently scalable group of services and data stores serving a defined population (2–5M registered users), with its own database primary, replicas, storage, and edge functions.

| Concern | Design |
|---|---|
| Routing | Global identity directory maps `user → cell`; tokens carry a cell claim; gateways route on it |
| Cell capacity | Sized at 5M registered / 400k DAU per cell; scale by adding cells, not by growing one |
| Data placement | Patient data never leaves its cell; only anonymised aggregates cross cells |
| Movement | Online tenant move: snapshot + CDC catch-up + short write freeze (< 60 s) + cutover |
| Failure containment | A cell failure affects its population only; no shared write path |
| Control plane | Config, routing, key distribution, feature flags |
| Control-plane outage | Cells continue serving reads and writes; routing changes and new sign-ups are blocked; JWKS and config cached locally |

**Cost of cells:** 20–50 cells at 100M users means 20–50 database clusters, 20–50 deployment pipelines, and a routing control plane. That is a large operational commitment. It is justified only when measurements show a single region cannot meet the SLOs — not preemptively.

### 12.7.4 Failover requirements (before any claim)

- Warm standby in a second EU region with ≥ 30% spare capacity.
- Documented failover and failback runbooks with measured times.
- Quarterly exercise: zone failure, regional dependency failure, identity-provider outage, key-service outage.
- Verify DNS, identity, KMS, object storage, and third-party dependencies all remain available during recovery.

All of the above is **blocked** today: no standby, no backup policy, no drill record.

---

## 12.8 H. Security and encryption at scale

Security controls must hold under load; none may be disabled to hit a performance target.

| Control | Current state | At-scale requirement |
|---|---|---|
| Authorisation at concurrency | RLS on 93 tables, 380 policies; capability functions evaluated per row | Cache capability per statement; test 10k concurrent requests with a mid-flight role change |
| Rate limiting | In-memory `Map` in 3 edge functions; global 30 req/min in the dev AI gateway | Shared store (Redis/Postgres) keyed by user + tenant + route; limits survive restarts and scale horizontally |
| Token refresh / revocation | Supabase Auth defaults; symmetric project JWT secret | Asymmetric signing keys + JWKS; revocation propagated ≤ 60 s; refresh capacity tested at 500/s |
| Key management throughput | Single provider-managed key set | KMS quota planning, data-key caching with documented revocation trade-off, rotation ≤ 90 days |
| Encryption latency | Provider-managed at rest, TLS in transit | Measure encrypt/decrypt cost on media paths; do not disable |
| Audit durability | Append-only tables with `UPDATE/DELETE/TRUNCATE` revoked (`20261101120000:965-966`) | Stream to immutable storage; test ingestion at 500M events/month; no sampling of clinical audit |
| Cache invalidation | No application cache today (safe but slow) | Any cache introduced must invalidate on permission change within 60 s; cache keys must include clearance scope |
| DoS / abuse | None beyond provider defaults; CORS `*` on all functions | WAF, per-IP and per-user limits, bot protection on auth, strict CORS |

**Permission propagation risk:** if capabilities are embedded in JWTs to avoid per-row lookups, revocation lags by the token lifetime (default 1 h). For clinical actions, either shorten the TTL to 15 minutes or verify the capability server-side at the moment of the action. Choose deliberately; do not inherit the default.

---

## 12.9 I. Realistic performance testing

### 12.9.1 Test instrument

`scripts/loadtest.mjs` is a dependency-free open-loop generator:

- fixed arrival rate with drift correction, so slow responses do not silently reduce offered load;
- in-flight cap, with saturation time reported;
- per-request p50/p95/p99, status distribution, byte counts;
- refuses non-loopback targets without `--allow-remote`, caps remote tests at 200 rps;
- tokens supplied via `LOADTEST_TOKEN`, never on the command line.

Scenarios: `static-shell.json` (instrument check), `t1-read-heavy.json` (weighted clinical reads against the new indexes and `latest_patient_vitals`), `t3-device-ingest.json` (batched vitals writes).

The staging dataset is `scripts/staging-seed.sql`. It is deliberately not a migration and refuses to run unless `set app.staging_seed = 'yes';` has been issued in the same session, so it cannot be fired at production by accident.

### 12.9.2 Instrument validation (executed 2026-11-01)

| Field | Value |
|---|---|
| Target | Local Vite dev server, `http://127.0.0.1:8091` |
| Offered load | 50 req/s for 5 s, max 100 in flight |
| Result | 250 issued, 250 completed, 0 errors, 49.9 req/s achieved |
| Latency | p50 10.4 ms, p95 15.7 ms, p99 72.8 ms |

This validates the tool. It says nothing about capacity: it is a developer laptop serving one HTML file, not a database, not a network, not a region. **Do not extrapolate it.**

### 12.9.3 Required test programme

Each run must record exact environment size, dataset size, workload mix, duration, and configuration.

| # | Scenario | Dataset | Load | Pass criteria |
|---|---|---|---|---|
| T1 | Baseline clinical read | 500M vitals, 100M messages, 10M patients | 1k rps, 30 min | p95 ≤ 300 ms, 0 errors |
| T2 | Gradual ramp | as T1 | 0 → 25k rps over 60 min | identify knee; no data loss |
| T3 | Peak write (device ingest) | 1B vitals rows | 30k writes/s, 30 min | p95 ≤ 400 ms, replication lag ≤ 2 s |
| T4 | Realtime fan-out | 300k messages/day, 5k clients | 2k msg/s to 5k subscribers | p95 delivery ≤ 2 s |
| T5 | AI burst | — | 100 concurrent tutor requests | p95 ≤ 10 s, no provider 429 storms |
| T6 | Video broadcast | 1M-assignment release | +50k viewers in 60 s | CDN hit > 95%, p95 start ≤ 2 s |
| T7 | Soak | as T1 | 40% of peak, 24 h | no memory growth, no connection leak |
| T8 | Failure injection | as T1 | kill replica / zone at 70% peak | SLO held, failover ≤ 15 min |
| T9 | Cold cache | as T1 | restart caches at peak | recovery ≤ 5 min |
| T10 | Uneven tenants | one tenant at 40% of load | sustained | per-tenant fairness holds |
| T11 | Offline resync | 2% of DAU reconnecting | 11k writes/s burst | no duplicates, no lost writes |
| T12 | Provider throttle | OpenAI/Resend returning 429 | peak load | circuit breaker opens, clinical flows unaffected |

**Cost estimate:** T1–T9 on a production-like cluster ≈ $400–$1,200 per run in compute plus engineer time; T3 and T6 require dedicated infrastructure. Obtain approval before any run that touches shared infrastructure or bills third parties.

**Blocked before T1 can run:**

- No seeded dataset at scale; the live database holds no clinical data.
- No staging project; the only backend is the live one on the free plan.
- No authenticated load-test credential (the script accepts `LOADTEST_TOKEN`).
- No server-side metrics (CPU, connections, replication lag) to correlate with client results.
- Provider quotas cannot be read: `supabase get_project` failed on 2026-11-01 and plan metadata is not in the repo.

---

## 12.10 J. Cost and operating model

Planning-grade estimates. Replace provider unit prices with quotes before budgeting; ±50% uncertainty.

### 12.10.1 Unit assumptions

| Item | Unit price | Note |
|---|---|---|
| Database query | $0.0000025 | Includes replicas, backups, and 40% headroom |
| Storage (blended) | $0.04 / GB-month | 80% object storage at $0.023, 20% database volume at $0.23, plus backups |
| Egress | $0.008–0.02 / GB | Committed CDN vs on-demand |
| API compute | $0.00000015–0.000002 / request | Self-managed vs serverless |
| Realtime delivery | $0.0000005 / message | Order-of-magnitude only |
| AI request | $0.00054 | 2k input + 400 output tokens at gpt-4o-mini pricing |
| SMS | $0.04 / message; email $0.001 | Push assumed free and preferred |

### 12.10.2 Monthly totals

| Registered | DAU | Requests/month | DB | Storage | Egress | API | Realtime | AI | Messaging | Obs. | KMS/audit | Staff | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1M | 84k | 173M | $430 | $410 | $2.1k | $26–346 | $45 | $136 | $1.4k | $170 | $84 | $35k | **~$40k** |
| 10M | 840k | 1.73B | $4.3k | $2.5k | $21k | $260–3.5k | $450 | $1.4k | $14k | $1.7k | $840 | $35k | **~$82–85k** |
| 50M | 4.2M | 8.64B | $21.6k | $10.2k | $105k | $1.3–17.3k | $2.3k | $6.8k | $70k | $8.4k | $4.2k | $55k | **~$285–301k** |
| 100M | 8.4M | 17.3B | $43.2k | $20.5k | $200k | $2.6–34.6k | $4.5k | $13.6k | $140k | $16.8k | $8.4k | $80k | **~$530–562k** |

### 12.10.3 Unit economics at 100M

| Metric | Value |
|---|---|
| Cost per MAU per month | **$0.016** (≈ $0.19/MAU/year) |
| Cost per DAU per month | **$0.065** |
| Cost per 1,000 requests (non-staff) | **$0.027** |
| Cost per clinical write | **$0.00018** |
| Cost per video viewing-hour | **$0.013** |
| Cost per AI request | **$0.00054** |

**Where the money goes:** video egress 36–38%, SMS 26%, database 8%, staffing 15%. Video delivery and SMS are the two levers worth engineering; neither is optimised today.

**Fixed-cost penalty at small scale:** at 1M registered users, staffing is 88% of cost and unit cost is 7× higher than at 100M. Do not present the 100M unit economics as near-term.

### 12.10.4 Controls

- Autoscaling with hard caps per service; spending alerts at 50/80/100% of forecast.
- Reserved capacity once load is predictable; committed CDN pricing above 100 TB/month.
- Cost controls must never silently interrupt clinical care: degrade analytics and AI first, and alert before any clinical threshold.
- Chargeback by tenant is required before serving many hospitals.

---

## 12.11 K. Operational readiness

| Requirement | Status | Evidence |
|---|---|---|
| Infrastructure as code | **Absent** | No Terraform/Pulumi/Docker/K8s/vercel/netlify config; `supabase/config.toml` is 11 lines |
| Reproducible environments | **Absent** | Manual `supabase db push`; no staging, no environment matrix |
| Automated deployment | **Absent** | No deploy workflow; APKs hand-built |
| CI gates | **Broken** | `.github/workflows/android.yml:24-26` runs `./gradlew` from the repo root, where no `gradlew` exists; no lint, test, or typecheck job on push |
| Canary / progressive release | **Absent** | No release mechanism |
| Backward-compatible migrations | **Absent** | No expand/contract discipline, no down migrations |
| Feature flags / kill switch | **Absent** | No flag system anywhere |
| Capacity dashboards | **Partial** | Client-side crash reporting added (`src/lib/observability.ts`): structured report with a short user-facing reference, query strings stripped, optional `VITE_ERROR_REPORT_URL` sink. No server metrics, no dashboards |
| User-impact alerting | **Partial** | Unhandled errors and rejections now reach a collector if `VITE_ERROR_REPORT_URL` is set; no alert routing and no synthetic checks |
| Incident response / on-call | **Absent** | No runbook, no ownership record |
| DR exercises | **Absent** | Backup advice only (`SECURITY_RECOMMENDATIONS.md:220`) |
| Provider quota management | **Absent** | No quota tracking; plan unknown to the repo |
| Observability cost/privacy control | Not applicable yet | No telemetry to sample; clinical audit must never be sampled |

**Error handling was silent; it is now reportable.** `src/components/ErrorBoundary.tsx` no longer renders the raw exception to the patient — it shows a generic message plus a short reference, and the detail goes to `reportError()`. `src/lib/observability.ts` also installs `error` and `unhandledrejection` listeners at boot, strips the query string (which can carry tokens), and forwards to `VITE_ERROR_REPORT_URL` when configured. Without that variable it still only reaches the console, so operators remain blind until a collector is chosen.

**Skills required and not present in the repo:** distributed-systems architecture, database performance and partitioning, SRE/on-call, performance testing, cloud networking, media-delivery engineering, FinOps, large-scale identity and security engineering. This is a staffing gap, not a code gap.

---

## 12.12 L. Required deliverables

| # | Deliverable | Status |
|---|---|---|
| 1 | Workload model with explicit assumptions | **Modelled** — §12.1 |
| 2 | Current measured capacity and bottlenecks | **Partially verified** — bundle sizes and instrument smoke test measured; backend capacity **blocked** (§12.9) |
| 3 | Proposed performance and availability objectives | **Proposed** — §12.2 |
| 4 | Architecture diagrams and decision records | **Delivered (proposed content)** — `docs/architecture/current-state.md` (context, containers, read path, ingest path, degradation ladder, target cells) and seven ADRs in `docs/adr/` |
| 5 | Database and storage growth plan | **Proposed** — §12.4, §12.10 |
| 6 | Load-test scripts and reproducible results | **Scripts delivered, results blocked** — `scripts/loadtest.mjs` plus T1/T3 scenarios and the staging seed; instrument validated, no capacity result |
| 7 | Failure and recovery test results | **Blocked** — no staging, no standby, no DR drill |
| 8 | Cost estimates and operational requirements | **Modelled** — §12.10–§12.11 |
| 9 | Phased migration plan with rollback and validation | **Proposed** — below |
| 10 | Capacity thresholds triggering the next scaling step | **Proposed** — below |

### 12.12.1 Classification of conclusions

**Verified at the tested scale (small):**

- Production bundle: 3.8 MB JS total, 607 kB entry chunk (173 kB gzip), 160 kB CSS; 30 routes lazy-loaded.
- Client data access: 328 `.from()` calls across 84 files; 23 `.limit()`/`.range()`; ~55–65 unbounded list reads.
- Schema: 93 tables, 90 index statements, 380 policies, 22 realtime tables, 16 row-level triggers.
- Instrument: 250 requests at 50 rps, p95 15.7 ms against a local dev server.
- Client tests: 51 of 51 passing across 5 files; typecheck clean; 0 lint errors against 201 tracked warnings.
- Backend: 52 of 52 migrations applied (2026-11-02); 11 edge functions in the repo, 4 deployed this cycle; no production clinical data as of the 2026-10-30 cutover.

**Modelled but not tested:** request rates, peak factors, device ingest, video bandwidth, storage growth, and all cost figures.

**Architecturally proposed:** SLO matrix, index and partitioning plan, queue design, media pipeline, regional cells, capacity thresholds.

**Blocked by missing evidence or access:** measured database throughput, authentication throughput, realtime capacity, CDN behaviour, failover and recovery time, provider quotas, production telemetry, and any load test at representative scale.

### 12.12.2 Phased plan

| Phase | Window | Work | Validation | Rollback |
|---|---|---|---|---|
| 0 — Observe and bound | 0–30 days | Pagination on every list; the six missing indexes; external rate limits; signed URLs; backups + PITR; observability (traces, DB metrics, error reporting); repair CI and add typecheck/lint/test gates | T1 at 1k rps in a seeded environment | Additive migrations; no destructive change |
| 1 — Decouple writes | 30–90 days | Partition vitals/messages/audit; retention jobs; queue for notifications and media; async AI; RLS `(select auth.uid())` rewrite; platform gateway replaces the dev-only AI middleware | T3 device ingest to 30k writes/s; T11 resync burst | Old tables kept read-only until dual-run validation passes |
| 2 — Regional readiness | 3–9 months | Read replicas; CDN with signed delivery; warm standby in a second EU region; Realtime fan-out redesign; test to 5k concurrent subscribers | T6, T8 failover drill | Standby is passive; cut back to primary |
| 3 — Cells | 9–18 months, only if measurements require | Regional cells with identity routing and control plane | Move one pilot cell end to end | Cell freeze + rollback to previous routing |

Phase 0 code status: pagination, indexes, external rate limits, signed URLs, CI repair and the quality gates are written, pass locally, and the two migrations plus all four edge functions were applied and deployed on 2026-11-02. Not yet done: `OPENAI_API_KEY` (so the gateway still returns 503), backups/PITR, and any observability — those need dashboard or billing access, so no T1 result exists.

### 12.12.3 Capacity thresholds

| Trigger | Next step |
|---|---|
| Database > 500 GB or `patient_vitals` > 100M rows | Partition and archive now |
| p95 clinical read > 300 ms at < 50% CPU | Index and RLS work before adding hardware |
| Sustained writes > 2k/s | Batch/queue device ingest; separate write path |
| Realtime > 5k concurrent connections or > 50k deliveries/s | Dedicated fan-out service |
| Egress > 50 TB/month | Committed CDN contract |
| Oldest queued message > 60 s | Scale workers; tighten admission control |
| Replica lag > 2 s | Shift reporting load; investigate primary |
| Auth refresh > 500/s | Scale GoTrue; review token lifetime |
| Error-budget burn > 2× in 1 hour | Freeze releases; incident review |

### 12.12.4 Statement of readiness

> **Not ready for 100 million users.** No workload target in §12.2 has supporting evidence at representative scale. The current architecture is a single-region, free-plan deployment with no observability, no backup drill, no queue, no partitioning, and unbounded client reads. Those are prerequisites, not optimisations.

---

## 12.13 Immediate findings that matter regardless of scale

These are correctness or safety issues that the capacity work exposed. Status is recorded as of 2026-11-01, when Phase 0 was implemented.

1. **Fabricated scan result.** The Defence publishing flow wrote "malware scan clean; transcode complete" to the audit log without running either.
   **Status: fixed in code.** Uploads now carry an explicit `processing` state. With no processor configured the wizard shows "No processor is configured", the draft reads "Not scanned or transcoded", and the history entry says "scan not run; transcode not run". Verified in the browser against the dev server.
2. **PHI URL misuse.** Medical records were uploaded then addressed with `getPublicUrl` on a private bucket.
   **Status: fixed in code.** Rows store the storage path; `src/lib/storage.ts` resolves short-lived signed URLs (600 s for records, 3600 s for profile photos) and parses legacy public URLs back to keys. Pending: the migration's bucket size and MIME limits must be applied.
3. **Whole-population vitals read.** `RemotePatientMonitoring.tsx` requested 500 unfiltered vitals rows and derived per-patient latest readings from that window.
   **Status: fixed and applied.** Now a single `supabase.rpc('latest_patient_vitals')` returning one row per patient via `distinct on`, from `20261101160000_scalability_indexes_and_rate_limits.sql`. Applied 2026-11-02; the function exists and denies `anon` while granting `authenticated`.
4. **Unfiltered staff message broadcast.** Every connected staff client received every `staff_messages` insert, then issued a profile query per message.
   **Status: fixed in code.** The subscription now carries `channel_id=in.(…)` for the caller's own channels, sender names are cached per session and seeded from message history, the subscription no longer restarts on channel switch (so no delivery gap), and the channel list loads its previews in one batched query instead of two round-trips per channel. Unread counts stay one cheap `head: true` count per channel — PostgREST cannot `GROUP BY` without an RPC.
5. **Dev-only AI gateway.** `/api/defence-ai` exists only in `vite dev`; a production build returns 404 for tutor and drafting.
   **Status: fixed and deployed.** `supabase/functions/defence-ai` authenticates the caller, gates on role, caps payloads and shares the DB rate limiter; `src/lib/defenceAi.ts` uses it outside dev. Deployed 2026-11-02 with `_shared/rateLimit.ts` bundled; an unauthenticated call returns 401 and an anonymous token is rejected by the function itself. End-to-end answers still return `503 provider_not_configured` until `OPENAI_API_KEY` is set.
6. **Unenforced per-instance limits.** The three edge-function rate limiters multiplied by instance count and reset on restart.
   **Status: fixed and applied.** All three now call `consume_rate_limit()` for a Postgres-backed fixed window, deployed 2026-11-02. The function is restricted to `service_role`; an `anon` call is refused with `42501`.
7. **Broken CI.** The only workflow that runs on push failed at `./gradlew` because the wrapper lives in `android/`.
   **Status: fixed.** `.github/workflows/android.yml` runs inside `android/` on JDK 21; `.github/workflows/ci.yml` adds typecheck, lint, test and build gates. Locally: typecheck clean, 36/36 tests pass, 0 lint errors (201 tracked warnings), production build succeeds.

One blocker remains and is external: the AI provider needs a key with credits. The migration and all four functions are applied as of 2026-11-02.
