# Web Authentication and Session Audit

Status: complete for TASK-220, verified 2026-08-26

## Current strategy

The Web uses the V1-compatible bearer-token strategy for the current Phase 2
deployment. A successful `POST /auth/login`
returns a JWT and username; `AuthContext` stores them as `auth_token` and
`auth_user` in `localStorage`. `apiClient` reads `auth_token` for each request
and sends it as an `Authorization: Bearer` header. The token is never placed in
TanStack Query data or query keys.

The API signs the token with the configured JWT secret and gives it a seven-day
expiration. Passport validates expiration on protected requests. On Web startup,
`AuthContext` calls `/auth/me` before exposing the authenticated layout. Logout
removes both localStorage entries and redirects the current tab; the V1 logout
endpoint is an acknowledgement and does not revoke a stateless JWT server-side.

## Browser and cross-tab behavior

Because `localStorage` is JavaScript-accessible, an XSS defect could read the
bearer token. No password, hash, authorization header, API response, Markdown,
exam payload, or answer key is stored there. Query cache state is memory-only and
has no persister, so closing/restarting the browser does not restore a token or
learning response through the query layer.

The current provider does not subscribe to the `storage` event. Therefore a
logout in one tab immediately affects that tab, while another already-open tab
may keep its in-memory auth state until its next protected request or reload.
This is documented behavior and is not treated as server-side session revocation.

## Cookie decision

`HttpOnly` cookies are not safe to introduce for the actual deployment yet. The
current owner topology is IP-only HTTP, so a `Secure` cookie cannot provide the
required transport guarantee; cookie authentication would also require an
approved CSRF design and a trusted HTTPS origin. Per ADR-024 and ADR-025, Web
continues using the explicit bearer strategy, Android remains unchanged, and
TASK-221 is deferred until HTTPS, origin, CORS/credentials, and CSRF prerequisites
are accepted.

This preserves the documented security boundary from `docs/07_SECURITY.md`
without presenting an insecure cookie migration as an improvement.
