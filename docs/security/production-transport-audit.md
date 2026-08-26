# Production transport audit

Status: complete for TASK-290, audited 2026-08-27.

## Observed deployment

The configured production host is the IP-only endpoint
157.173.127.217. Read-only checks from the development host found:

| Endpoint                 | Result                              |
| ------------------------ | ----------------------------------- |
| TCP 157.173.127.217:3000 | reachable                           |
| TCP 157.173.127.217:4000 | reachable                           |
| HTTP API /health         | 200, JSON health response           |
| HTTP API /health/ready   | 404, route absent on deployed image |
| HTTP Web :3000           | 200                                 |
| HTTPS API :4000          | TLS handshake failed                |

The API liveness response was served over HTTP and included Vary: Origin; no
HTTPS or HSTS guarantee was observed. A recheck of the database-backed readiness
route on 2026-08-27 returned 404, which shows that the deployed API image does
not yet include the current readiness route. The deployed response also exposed
the Express server header, so the update workflow must pull the current API
image before treating source-level hardening and readiness as live.

The guarded update is not considered production-healthy until it passes both
`/health` and `/health/ready` after the owner updates the image.

## Accepted Phase 2 posture

HTTPS is deferred because the current personal deployment has no owner-approved
domain or certificate endpoint. This is an explicit transport risk: credentials,
bearer tokens, and learning traffic can be observed or modified on an
untrusted network. Web and Android therefore continue to use the documented
HTTP URLs, and the Web does not claim Secure-cookie production behavior.

## Upgrade path

When the owner accepts a domain, put a Caddy reverse proxy in front of Web/API,
obtain an automatic certificate from the domain's public DNS, expose only 80/443
at the edge, keep PostgreSQL private, and change Web/API/Android URLs and CORS
to HTTPS. Only after that validation should the bearer strategy be reconsidered
for HttpOnly Secure SameSite cookies with CSRF protection.

No domain, certificate, credential, or external deployment state was fabricated
by this audit.
