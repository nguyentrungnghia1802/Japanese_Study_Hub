import { describe, it, expect } from 'vitest';
import * as bcrypt from 'bcrypt';
import {
  getDefaultCorsOrigins,
  LOCAL_CORS_ORIGIN,
  PRODUCTION_CORS_ORIGIN,
  validateEnvironment,
} from './env.validation.js';

const testPasswordHash = bcrypt.hashSync('test-only-password', 4);
const testTokenSecret = 't'.repeat(32);

describe('Environment Validation (TASK-011)', () => {
  it('accepts valid configuration and provides defaults', () => {
    const config = {
      NODE_ENV: 'development',
      PORT: 4000,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      AUTH_USERNAME: 'admin',
      AUTH_PASSWORD_HASH: testPasswordHash,
      AUTH_TOKEN_SECRET: testTokenSecret,
    };

    const validated = validateEnvironment(config);
    expect(validated.PORT).toBe(4000);
    expect(validated.AUTH_USERNAME).toBe('admin');
  });

  it('rejects invalid NODE_ENV', () => {
    const config = {
      NODE_ENV: 'invalid_env_name',
    };

    expect(() => validateEnvironment(config)).toThrow('Environment validation failed');
  });

  it('rejects short AUTH_TOKEN_SECRET', () => {
    const config = {
      AUTH_TOKEN_SECRET: 'short',
    };

    expect(() => validateEnvironment(config)).toThrow('Environment validation failed');
  });

  it('rejects missing authentication material instead of using a committed fallback', () => {
    expect(() => validateEnvironment({ NODE_ENV: 'test' })).toThrow(
      'Environment validation failed',
    );
  });

  it('uses the local CORS origin outside production', () => {
    expect(getDefaultCorsOrigins('development')).toBe(LOCAL_CORS_ORIGIN);
    expect(getDefaultCorsOrigins('test')).toBe(LOCAL_CORS_ORIGIN);
  });

  it('uses the production web origin when NODE_ENV is production', () => {
    const validated = validateEnvironment({
      NODE_ENV: 'production',
      AUTH_PASSWORD_HASH: testPasswordHash,
      AUTH_TOKEN_SECRET: testTokenSecret,
    });

    expect(getDefaultCorsOrigins('production')).toBe(PRODUCTION_CORS_ORIGIN);
    expect(validated.CORS_ORIGINS).toBe(PRODUCTION_CORS_ORIGIN);
  });
});
