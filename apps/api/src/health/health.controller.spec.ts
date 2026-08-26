import { describe, it, expect, vi } from 'vitest';
import { ServiceUnavailableException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service.js';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const prismaMock = {
    $queryRawUnsafe: vi.fn(),
  } as unknown as PrismaService;

  it('returns ok status and service name', () => {
    const controller = new HealthController(prismaMock);
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('japanese-study-hub-api');
    expect(result.timestamp).toBeDefined();
  });

  it('reports database readiness', async () => {
    prismaMock.$queryRawUnsafe = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    const controller = new HealthController(prismaMock);

    await expect(controller.ready()).resolves.toMatchObject({
      status: 'ok',
      database: 'ok',
    });
  });

  it('returns a service-unavailable error when the database is unreachable', async () => {
    prismaMock.$queryRawUnsafe = vi.fn().mockRejectedValue(new Error('database unavailable'));
    const controller = new HealthController(prismaMock);

    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
