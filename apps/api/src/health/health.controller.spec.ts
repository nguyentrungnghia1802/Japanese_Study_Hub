import { describe, it, expect } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns ok status and service name', () => {
    const controller = new HealthController();
    const result = controller.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('japanese-study-hub-api');
    expect(result.timestamp).toBeDefined();
  });
});
