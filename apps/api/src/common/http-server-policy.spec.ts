import { describe, expect, it } from 'vitest';
import { configureHttpServer, HTTP_SERVER_POLICY } from './http-server-policy.js';

describe('HTTP server connection policy', () => {
  it('uses a bounded keep-alive window and timeout ordering safe for proxies', () => {
    const server = { keepAliveTimeout: 0, headersTimeout: 0, requestTimeout: 0 };

    configureHttpServer(server);

    expect(server).toEqual({
      keepAliveTimeout: HTTP_SERVER_POLICY.keepAliveTimeoutMs,
      headersTimeout: HTTP_SERVER_POLICY.headersTimeoutMs,
      requestTimeout: HTTP_SERVER_POLICY.requestTimeoutMs,
    });
    expect(server.headersTimeout).toBeGreaterThan(server.keepAliveTimeout);
  });
});
