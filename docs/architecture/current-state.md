# Architecture — current state and target

**Status:** current state is observed from the repository at `2026-11-02`. Target state is proposed and not built.
**Companion:** `SCALABILITY_AUDIT.md` §12.3–§12.7 (limits, cells, residency), `docs/adr/` (decision records).

Everything below separates what exists from what is proposed. No diagram in this file implies a capability that has been measured.

---

## 1. System context

Users, external providers, and the boundary of the platform. Nothing inside the boundary has been load-tested.

```mermaid
flowchart LR
  patient(["Patient<br/>web + Android"])
  staff(["Clinical staff<br/>web"])
  admin(["Administrator"])
  defence(["Defence learner<br/>clearance-scoped"])
  ops(["Operator / on-call<br/>no tooling today"])

  subgraph trika["Trika Health / Telemed-X"]
    platform["Clinical platform<br/>records, appointments, vitals,<br/>messaging, learning hub"]
  end

  openai["OpenAI<br/>tutor + clinical assistant"]
  daily["Daily.co<br/>telemedicine rooms"]
  resend["Resend<br/>email"]
  sms["SMS provider"]
  devices["Medical devices<br/>RPM ingest"]

  patient --> platform
  staff --> platform
  admin --> platform
  defence --> platform
  devices --> platform
  platform --> openai
  platform --> daily
  platform --> resend
  platform --> sms
  platform -.->|"no metrics, no logs, no alerts"| ops
```

The operator edge is dashed on purpose: there is no observability backend, so incidents are invisible until a user reports them (`SCALABILITY_AUDIT.md` §12.11).

---

## 2. Containers (as deployed today)

```mermaid
flowchart TB
  subgraph clients["Clients"]
    spa["React 18 SPA<br/>30 lazy routes<br/>607 kB entry / 173 kB gzip"]
    android["Capacitor Android<br/>same bundle in a webview"]
  end

  subgraph hosting["Static hosting"]
    static["Built assets<br/>no CDN policy, no cache headers"]
  end

  subgraph devonly["Development only"]
    middleware["Vite middleware<br/>/api/defence-ai<br/>apply: 'serve'"]
  end

  subgraph sb["Supabase · eu-north-1 · free plan · single primary"]
    gotrue["GoTrue<br/>auth, refresh, recovery"]
    pg[("Postgres<br/>93 tables · 380 policies<br/>90 index statements")]
    rt["Realtime<br/>22 tables published"]
    storage[("Object storage<br/>3 private buckets<br/>no lifecycle rules")]
    fn["Edge functions × 11"]
  end

  spa --> static
  android --> static
  spa -->|"PostgREST + RLS"| pg
  spa -->|"postgres_changes"| rt
  spa -->|"signed upload / signed URL"| storage
  spa -->|"in dev only"| middleware
  spa -->|"outside dev"| fn
  spa --> gotrue
  fn --> pg
  fn --> storage
  middleware -->|"OPENAI_API_KEY"| openai["OpenAI"]
  fn -->|"service role"| pg
```

Two facts in this diagram are load-bearing:

- `middleware` and `fn` are **alternative** paths for the AI feature. The dev path exists only under `vite dev`; the edge function is written but **not deployed** (`SCALABILITY_AUDIT.md` §12.13 finding 5).
- Every data path terminates in one Postgres primary. There is no replica, no queue, and no second store.

---

## 3. Clinical read path (the dominant load)

85% of modelled requests are reads (§12.1.2). The path is client → PostgREST → RLS evaluation → table.

```mermaid
sequenceDiagram
  autonumber
  participant C as Staff client
  participant G as GoTrue
  participant P as PostgREST
  participant D as Postgres primary
  participant R as Realtime

  C->>G: refresh (JWT, 1 h default)
  G-->>C: access token
  C->>P: GET /patient_vitals?select=…&order=…
  P->>D: SET LOCAL role authenticated + JWT claims
  D->>D: evaluate RLS per row<br/>218 policies call auth.uid()<br/>118 call has_role()
  D-->>P: rows
  P-->>C: JSON 2–40 KB
  D-->>R: WAL
  R-->>C: postgres_changes (filtered)
```

Failure and cost characteristics:

| Step | What breaks first | Mitigation in place |
|---|---|---|
| RLS per row | 5k-row scans per request at 380 policies | six policies rewritten in `20260331174041`, not extended |
| Result size | 55–65 unbounded list reads in the client | cursor helper (`src/lib/pagination.ts`) on the high-volume paths |
| Realtime | unfiltered subscriptions fan out to every client | staff messages now scoped to membership (§12.13 finding 4) |

---

## 4. Device ingest path (the hardest number)

2M monitored patients at one reading every 5 minutes is 576M writes/day, 26,700/s at peak. The path today:

```mermaid
flowchart LR
  dev["Device / gateway"] -->|"HTTP"| api["insert into patient_vitals"]
  api --> rls["RLS check per row"]
  rls --> tbl[("patient_vitals<br/>unpartitioned, indexed")]
  tbl --> wal["WAL"]
  wal --> rt["Realtime fan-out<br/>to every subscribed clinician"]
  wal --> bk["backup<br/>provider default"]
```

There is no admission control, no batching, no dead-letter path, and no idempotency key. A retried device write creates a duplicate reading. This is the path the capacity plan is built around, and the one that must be restructured before any ingest client is shipped at scale (§12.3 limit 1, §12.6).

---

## 5. Failure and degradation ladder

The intended order of shedding, from the SLO matrix. Only the left column is implemented (by omission — nothing is shed today because nothing is bounded).

```mermaid
flowchart TD
  fail["Saturation event"] --> q{"Which class?"}
  q -->|"analytics / media / AI"| shed1["Shed immediately<br/>optional by definition"]
  q -->|"exports / reports"| shed2["Return 202, queue with bound<br/>refuse when full"]
  q -->|"non-urgent notifications"| shed3["Delay; keep critical alerts"]
  q -->|"clinical read / write"| keep["Never shed<br/>fail loudly instead of silently"]

  shed1 --> note1["today: no queue, so these<br/>compete directly with clinical traffic"]
  shed2 --> note1
  shed3 --> note1
  keep --> note2["today: no statement_timeout,<br/>no admission control"]
```

The gap this diagram exposes: without queues and timeouts there is no mechanism to honour the ladder. Overload produces uniform degradation, including of clinical work, rather than an ordered shed.

---

## 6. Target state (proposed, gated on measurement)

Introduce components only when a measurement demands them. Each box below has a trigger in §12.12.3.

```mermaid
flowchart TB
  subgraph cellA["Cell A · EU"]
    rtA["Routing table<br/>user → cell"]
    pgA[("Primary + 1 replica")]
    qA["Queue: notifications<br/>media · AI · exports<br/>device ingest"]
    stA[("Storage + signed delivery")]
    cdA["CDN<br/>tenant-scoped cache keys"]
    obsA["Metrics, traces,<br/>user-impact alerts"]
  end

  subgraph cellB["Cell B · EU (only if residency or capacity requires)"]
    pgB[("Primary + replica")]
  end

  ctrl["Control plane<br/>config · routing · keys · flags<br/>cells serve through its outage"]

  cellA --> ctrl
  cellB --> ctrl
  cdA --> clients["Clients"]
  clients --> rtA
```

**Not justified yet.** One region may well meet the agreed SLOs at the modelled load; the cost of a second cell is a second database cluster, a second pipeline, and a control plane with its own failure modes (§12.7.3). Cells are included here as a shape to plan around, not a commitment.

---

## 7. Diagram inventory and provenance

| Diagram | Source | Confidence |
|---|---|---|
| Context | provider calls in edge functions and `src/lib` | observed |
| Containers | `supabase/`, `vite.config.ts`, build output | observed |
| Read path | `src/hooks`, RLS migrations | observed, RLS cost modelled |
| Ingest path | `20260221145003_*.sql`, `20260222101104_*.sql` | observed |
| Degradation | SLO matrix §12.2 | proposed |
| Target cells | §12.7.3 | proposed |

Counts (93 tables, 380 policies, 90 index statements, 22 realtime tables) are from the 2026-11-01 audit of 48 applied migrations plus the 4 on disk. Re-derive after the pending migrations are applied.
