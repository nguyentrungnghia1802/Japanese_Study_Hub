# API conditional-cache policy

Status: implemented for TASK-230, 2026-08-26

The API keeps Express's entity-tag generation enabled and applies a route/method
policy before controllers run:

| Request class                             | Policy                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| Authenticated normal `GET`/`HEAD` reads   | `Cache-Control: private, no-cache` and `Vary: Authorization` |
| Auth, health, export, attempt/live routes | `Cache-Control: no-store`                                    |
| `POST`, `PUT`, `PATCH`, and `DELETE`      | `Cache-Control: no-store`                                    |

`private` prevents shared caches from retaining learning data. `no-cache` asks
the owning browser to revalidate, so a fresh response or a correct `304 Not
Modified` is selected by the server's ETag instead of serving a stale exam or
library body. Attempt responses are excluded from this path even though they
are GETs. `Vary: Authorization` documents that bearer identity is part of the
response boundary.

The policy is implemented in
`apps/api/src/common/middleware/cache-control.middleware.ts` and covered by
unit tests. The production smoke gate must send a first authenticated GET,
capture its ETag, then repeat with `If-None-Match`; a 304 is a required check.
The smoke must also verify that an auth or attempt response has `no-store` and
never claim shared/public caching.
