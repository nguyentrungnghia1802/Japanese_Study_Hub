# HTTP transport audit

Status: implemented for TASK-231, 2026-08-26

## Current topology

`docker-compose.yml` currently defines PostgreSQL only. The API and Web Docker
images expose ports 4000 and 3000 respectively, and there is no checked-in Nginx,
Traefik, or other reverse-proxy configuration. Therefore local/host deployment
may terminate connections directly at Node, while a production edge remains
responsible for TLS, HTTP/2, and optional Brotli.

## API behavior

`apps/api/src/main.ts` disables the Express identification header and enables the
`compression` middleware with a 1 KiB threshold. JSON and other compressible text
responses can use gzip when the client advertises it; binary/explicit downloads
retain their content semantics and are not forced through a transformation.

The Node HTTP server uses a 65-second keep-alive timeout, a 66-second header
timeout, and a 120-second request timeout. The header timeout is intentionally
slightly longer than keep-alive so an edge has time to close idle connections
without cutting off a valid header exchange. A future reverse proxy should use a
keep-alive/idle timeout greater than the Node value and preserve `Content-Encoding`
and `Vary` headers.

The API unit tests cover timeout ordering. The live smoke gate must verify a
large authenticated text response with `Accept-Encoding: gzip` returns a valid
compressed response, and that decompression produces the same JSON/Markdown
bytes as an uncompressed request.
