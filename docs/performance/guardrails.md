# Phase 2 performance regression guardrails

Status: implemented for TASK-301, 2026-08-27.

## Web bundle

After a production Web build, run pnpm perf:bundle. The check reads the Next
App Router build manifest and uses uncompressed static JavaScript bytes:

- all static JavaScript: at most 1,250,000 bytes;
- one JavaScript chunk: at most 220 KiB;
- one route manifest JavaScript total: at most 450 KiB.

The current build passed with 1,067,171 total static bytes, a 172,834-byte
largest chunk, and a 400,628-byte largest route. These thresholds provide
bounded headroom over the measured baseline without pretending that a local
micro-benchmark is a production SLO. A threshold change requires a new
measured explanation in bundle-audit.md.

## API response smoke

With the API running, run pnpm perf:api-smoke to check public liveness and
database-backed readiness. It enforces 2 KiB for health responses and 256 KiB
for additional paths. Add authenticated paths without printing the token by
setting API_SMOKE_TOKEN and API_SMOKE_ENDPOINTS.

The smoke reads response bytes after client decompression and checks status
codes. It is intentionally a response-size bound, not a latency benchmark.

## Query/N+1 guard

The query audit in prisma-query-audit.md remains the reliable Phase 2 query
guard: bounded collection tests, no core N+1 loop, and EXPLAIN evidence against
PostgreSQL 16. No timing-based query-count threshold is added because it would
be flaky on a personal development database. Any new include or per-row query
must update that audit with representative EXPLAIN evidence.
