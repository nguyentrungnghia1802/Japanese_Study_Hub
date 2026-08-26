import type { Server } from 'node:http';

export const HTTP_SERVER_POLICY = Object.freeze({
  keepAliveTimeoutMs: 65_000,
  headersTimeoutMs: 66_000,
  requestTimeoutMs: 120_000,
});

export function configureHttpServer(
  server: Pick<Server, 'keepAliveTimeout' | 'headersTimeout' | 'requestTimeout'>,
) {
  server.keepAliveTimeout = HTTP_SERVER_POLICY.keepAliveTimeoutMs;
  server.headersTimeout = HTTP_SERVER_POLICY.headersTimeoutMs;
  server.requestTimeout = HTTP_SERVER_POLICY.requestTimeoutMs;
}
