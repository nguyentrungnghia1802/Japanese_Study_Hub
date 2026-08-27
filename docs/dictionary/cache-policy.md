# Lookup cache and history policy

This policy implements TASK-404 and refines ADR-033. The API owns a small
in-process TTL/LRU cache for normalized lookup data in
`apps/api/src/dictionary/dictionary-cache.ts`. It is intentionally separate
from the Web TanStack Query cache, Android Room read projection, and persisted
lookup history/favorites.

## Normalized response cache

| Cache purpose           | Successful response TTL | Empty/no-result TTL | Key dimensions                                                |
| ----------------------- | ----------------------: | ------------------: | ------------------------------------------------------------- |
| Lookup response         |                24 hours |           2 minutes | purpose, resolved direction, NFKC query, limit, examples flag |
| Single-kanji enrichment |                24 hours |           2 minutes | purpose, direction, character/query, limit                    |
| Examples                |                12 hours |           2 minutes | purpose, direction, normalized query, limit                   |
| Suggestions             |               5 minutes |           2 minutes | purpose, direction, normalized prefix, limit                  |

The hard cache bound is 256 entries per API process. A hit refreshes LRU order;
expired entries are removed on access/write/size inspection. The cache stores
only normalized project DTOs. Raw provider JSON, raw Wiktionary wikitext,
authorization headers, exam payloads, and secrets are never values or keys.

Provider failures are not cached long-term. A timeout, HTTP 429, malformed
response, or provider 5xx is returned through the typed provider error policy;
only a deliberate normalized empty result may use the two-minute no-result TTL.
The cache is process-local and may be empty after restart without changing
domain behavior. Redis or another distributed cache is not introduced for
Lookup.

## Key and bypass behavior

Keys apply Unicode NFKC, trim input, collapse formatting whitespace, and keep
the resolved direction and cache purpose distinct. The API never exposes cache
keys. There is no user-facing cache bypass/debug switch in production. Local
tests may inject a clock and inspect size/eviction behavior without logging
response bodies. If a future operational bypass is needed, it must be an
allow-listed non-production configuration and must not be accepted from a
client request.

## Persisted history boundary

Lookup history is a separate compact persistence concern, implemented after
this policy. It may store at most 100 recent items per logical user, with query,
resolved direction, selected primary label when useful, and server timestamp.
It must deduplicate adjacent/same-query entries deterministically, prune by
server timestamp and stable ID, and never store meanings arrays, examples,
provider payloads, or raw source data. Favorites have their own bounded,
authenticated persistence and do not reuse the cache table.

## Attribution

Normalized responses retain the source metadata required by
`docs/dictionary/provider-evaluation-2026-08-27.md`. Cache hits preserve that
metadata; eviction does not remove any persisted attribution requirement because
history/favorites store only the compact source metadata required to reopen a
lookup.
