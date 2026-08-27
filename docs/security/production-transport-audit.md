# Production transport audit

Status: complete for TASK-290, audited 2026-08-27.

## Observed deployment

The configured production host is the IP-only endpoint
157.173.127.217. Read-only checks from the development host found:

| Endpoint                 | Result                         |
| ------------------------ | ------------------------------ |
| TCP 157.173.127.217:3000 | reachable                      |
| TCP 157.173.127.217:4000 | reachable                      |
| HTTP API /health         | 200, JSON health response      |
| HTTP API /health/ready   | 200, database-backed readiness |
| HTTP Web :3000           | 200                            |
| HTTPS API :4000          | TLS handshake failed           |

The API liveness and readiness responses were served over HTTP and included
`Vary: Origin`; no HTTPS or HSTS guarantee was observed. After the owner ran the
guarded update using the published Phase 2 image, the read-only recheck on
2026-08-27 returned 200 from both `/health` and `/health/ready`. The current
image therefore includes the database-backed readiness route.

The guarded update is considered production-healthy for the current HTTP-only
topology after both health endpoints and the Web root passed. The transport
risk below remains explicit and is not silently treated as HTTPS support.

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

The owner confirmed the production deployment, backup/restore checks, and
Android production validation for the Phase 2 release. This audit records that
confirmation without copying credentials or external artifacts into the
repository; no domain, certificate, or secret was fabricated.
