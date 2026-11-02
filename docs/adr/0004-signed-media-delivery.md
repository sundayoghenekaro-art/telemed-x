# 0004 — Media bytes leave the application path; delivery is signed

**Status:** Accepted, implemented in code, migration pending · **Date:** 2026-11-02

## Context

Medical records were uploaded to a private bucket and then addressed with `getPublicUrl`, which cannot work on a private bucket and would leak protected health information if it did (`MedicalRecordsTab.tsx:78-80`, §12.13 finding 2). There is no size or MIME gate, no resumable upload, no lifecycle rule, and no CDN (§12.5.1).

At the modelled peak, video is 210 Gbps of concurrent delivery and 562 TB/day of egress (§12.5.3). Routing that through application servers, or through signed-URL issuance per object per viewer, is both a cost and an availability problem.

## Decision

Three rules, applied progressively:

1. **Bytes never transit the application server.** The browser uploads to object storage; the application issues a short-lived credential and validates size, MIME, and quota before upload starts. Resumable (TUS/multipart) is required for anything above the provider's single-request limit.
2. **Delivery is signed, never public.** `src/lib/storage.ts` resolves a recorded storage path to a short-lived signed URL (600 s for records, 3600 s for avatars) and rejects anything with a URI scheme, so a legacy public URL is parsed back to its key rather than handed to the browser. `getPublicUrl` must not appear on a PHI path.
3. **A CDN is added when total egress exceeds 50 TB/month, not before.** When it is added, its cache key includes tenant and clearance scope — a shared cache keyed only on object path leaks restricted content after a permission change (§12.5.2).

Metadata, access policy, and audit stay in Postgres, linked to the authoritative record. The object store holds bytes and nothing else.

## Consequences

**Positive**
- No PHI in a public URL; revocation is bounded by the signed-URL lifetime (≤ 15 min target).
- Application CPU is independent of file size; a 500 MB DICOM does not touch a function.
- The migration adds bucket-level size and MIME limits, so an oversized upload fails at the boundary rather than in a renderer.

**Negative**
- Every media render requires a signing round trip; batched signing is needed for grids of thumbnails.
- Signed URLs cannot be cached by a shared CDN in the naive way, which is why rule 3 defers the CDN until the key design is settled.
- Until a real scanner exists, uploads stay in an explicit `processing` state and nothing is downloadable. That is deliberate: the previous "scan clean" audit entry was fabricated (§12.13 finding 1).

**Operational**
- Bucket limits depend on `20261101160000_scalability_indexes_and_rate_limits.sql`, which is **not yet applied**. Until it is, the client-side guards are the only limit.
- Transcoding, thumbnailing, and extraction are asynchronous work and depend on the queue in ADR-0006.

## Alternatives rejected

- **Proxy downloads through an edge function.** Adds a hop, a bandwidth bill, and a function timeout to every large file, and still needs the same authorisation check.
- **Keep buckets public and rely on unguessable paths.** Path secrecy is not authorisation, and it fails audit.
- **Build the CDN and transcoding pipeline now.** No media exists at volume; the cost is real and the benefit unmeasurable. Deferred against a stated trigger.

## Revisit trigger

Egress above 50 TB/month, or the first headquarters broadcast that exceeds 1,000 concurrent viewers — whichever comes first (§12.12.3).
