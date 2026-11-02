#!/usr/bin/env node
// Open-loop HTTP load generator. Schedules requests at a fixed arrival rate and
// keeps going when responses slow down, so saturation shows up as latency and
// shed requests rather than as a gently reduced offered load.

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, index, all) => {
    if (arg.startsWith('--')) {
      const next = all[index + 1];
      pairs.push([arg.slice(2), next && !next.startsWith('--') ? next : 'true']);
    }
    return pairs;
  }, []),
);

if (args.help || !args.scenario) {
  console.log(`Usage: node scripts/loadtest.mjs --scenario <file.json> [options]

Options:
  --rps <n>               Target arrival rate (default 20)
  --duration <seconds>    Test duration (default 30)
  --max-concurrency <n>   In-flight request cap (default 100)
  --timeout <ms>          Per-request timeout (default 10000)
  --label <text>          Label for the report
  --allow-remote          Permit a non-loopback target (rate capped at 200 rps)
  --max-error-rate <0..1> Exit non-zero above this error ratio (default 0.01)

Scenario file:
{
  "target": "http://127.0.0.1:8091",
  "requests": [
    { "name": "home", "method": "GET", "path": "/", "weight": 3 },
    { "name": "tutor", "method": "POST", "path": "/api/defence-ai", "weight": 1,
      "body": { "mode": "tutor", "question": "...", "sources": [] } }
  ]
}

Optional environment:
  LOADTEST_TOKEN   Bearer token sent when the scenario sets "auth": true
  LOADTEST_HEADERS JSON object of extra headers
`);
  process.exit(args.help ? 0 : 2);
}

const rps = Number(args.rps ?? 20);
const duration = Number(args.duration ?? 30);
const maxConcurrency = Number(args['max-concurrency'] ?? 100);
const timeoutMs = Number(args.timeout ?? 10_000);
const maxErrorRate = Number(args['max-error-rate'] ?? 0.01);
const label = args.label ?? 'loadtest';

for (const [name, value] of Object.entries({ rps, duration, maxConcurrency, timeoutMs })) {
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`Invalid --${name}: ${value}`);
    process.exit(2);
  }
}

const scenario = JSON.parse(readFileSync(args.scenario, 'utf8'));
const target = new URL(scenario.target);
const isLoopback = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(target.hostname);

if (!isLoopback && !args['allow-remote']) {
  console.error(`Refusing to load-test ${target.origin}: not a loopback address. Pass --allow-remote if this is authorised.`);
  process.exit(2);
}
if (!isLoopback && rps > 200) {
  console.error('Refusing more than 200 rps against a remote target. Scale up deliberately, with approval.');
  process.exit(2);
}

const requests = (scenario.requests ?? []).filter((entry) => entry.weight !== 0);
if (requests.length === 0) {
  console.error('Scenario contains no requests.');
  process.exit(2);
}

const schedule = requests.flatMap((entry) =>
  Array.from({ length: Math.max(1, Math.round(entry.weight ?? 1)) }, () => entry),
);

const extraHeaders = JSON.parse(process.env.LOADTEST_HEADERS ?? '{}');
const baseHeaders = { 'content-type': 'application/json', ...extraHeaders };

const results = new Map(requests.map((entry) => [entry.name, { latencies: [], statuses: {}, errors: [], bytes: 0 }]));
let issued = 0;
let completed = 0;
let failures = 0;
let inFlight = 0;
let saturationMs = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

async function fire(entry) {
  const stat = results.get(entry.name);
  const startedAt = performance.now();
  try {
    const response = await fetch(new URL(entry.path, target), {
      method: entry.method ?? 'GET',
      headers: {
        ...baseHeaders,
        ...(entry.auth ? { authorization: `Bearer ${process.env.LOADTEST_TOKEN ?? ''}` } : {}),
        ...(entry.headers ?? {}),
      },
      body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = await response.arrayBuffer();
    const elapsed = performance.now() - startedAt;
    stat.latencies.push(elapsed);
    stat.bytes += payload.byteLength;
    stat.statuses[response.status] = (stat.statuses[response.status] ?? 0) + 1;
    if (response.status >= 400) failures += 1;
  } catch (error) {
    const elapsed = performance.now() - startedAt;
    stat.latencies.push(elapsed);
    const reason = error?.name === 'TimeoutError' ? `timeout>${timeoutMs}ms` : (error?.cause?.code ?? error?.message ?? 'error');
    stat.statuses[reason] = (stat.statuses[reason] ?? 0) + 1;
    stat.errors.push(reason);
    failures += 1;
  } finally {
    completed += 1;
    inFlight -= 1;
  }
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

const intervalMs = 1000 / rps;
const startedAt = performance.now();
let endsAt = startedAt + duration * 1000;
const active = new Set();
let scheduledAt = startedAt;

process.on('SIGINT', () => {
  console.error('\nInterrupted.');
  endsAt = 0;
});

console.log(`${label}: ${rps} rps for ${duration}s against ${target.origin} (max ${maxConcurrency} in flight)`);

while (performance.now() < endsAt) {
  const now = performance.now();
  if (now >= scheduledAt) {
    if (inFlight >= maxConcurrency) {
      saturationMs += now - scheduledAt;
      await Promise.race(active);
      scheduledAt = Math.max(scheduledAt, performance.now());
    }
    const entry = schedule[issued % schedule.length];
    issued += 1;
    inFlight += 1;
    const task = fire(entry).finally(() => active.delete(task));
    active.add(task);
    scheduledAt += intervalMs;
  } else {
    await sleep(Math.min(scheduledAt - now, 25));
  }
}

await Promise.all(active);
const wallMs = performance.now() - startedAt;
const achievedRps = completed / (wallMs / 1000);
const allLatencies = [...results.values()].flatMap((stat) => stat.latencies);
const errorRate = completed === 0 ? 0 : failures / completed;

const summary = {
  label,
  target: target.origin,
  targetRps: rps,
  achievedRps: Number(achievedRps.toFixed(1)),
  durationSeconds: Number((wallMs / 1000).toFixed(1)),
  issued,
  completed,
  errorRate: Number(errorRate.toFixed(4)),
  saturationMs: Math.round(saturationMs),
  latencyMs: {
    p50: Number(percentile(allLatencies, 50).toFixed(1)),
    p95: Number(percentile(allLatencies, 95).toFixed(1)),
    p99: Number(percentile(allLatencies, 99).toFixed(1)),
    max: Number((allLatencies.length ? Math.max(...allLatencies) : 0).toFixed(1)),
  },
  requests: Object.fromEntries(
    [...results.entries()].map(([name, stat]) => [
      name,
      {
        count: stat.latencies.length,
        statuses: stat.statuses,
        p50: Number(percentile(stat.latencies, 50).toFixed(1)),
        p95: Number(percentile(stat.latencies, 95).toFixed(1)),
        p99: Number(percentile(stat.latencies, 99).toFixed(1)),
        bytes: stat.bytes,
      },
    ]),
  ),
};

console.log(JSON.stringify(summary, null, 2));
if (errorRate > maxErrorRate) {
  console.error(`Error rate ${(errorRate * 100).toFixed(2)}% exceeds ${(maxErrorRate * 100).toFixed(2)}%`);
  process.exit(1);
}
