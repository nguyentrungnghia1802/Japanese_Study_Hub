import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';

describe('AuthService (TASK-020 / AUTH-001..009)', () => {
  let authService: AuthService;
  let configService: ConfigService;
  let jwtService: JwtService;

  const testPassword = 'test-only-password';
  const passwordHash = bcrypt.hashSync(testPassword, 4);
  const testTokenSecret = 't'.repeat(32);

  beforeEach(() => {
    configService = {
      get: (key: string) => {
        if (key === 'AUTH_USERNAME') return 'admin';
        if (key === 'AUTH_PASSWORD_HASH') return passwordHash;
        if (key === 'AUTH_TOKEN_SECRET') return testTokenSecret;
        return null;
      },
    } as unknown as ConfigService;

    jwtService = new JwtService({
      secret: testTokenSecret,
    });

    authService = new AuthService(configService, jwtService);
  });

  it('authenticates correct credentials and returns access token', async () => {
    const result = await authService.login({
      username: 'admin',
      password: testPassword,
    });

    expect(result).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.expiresIn).toBeGreaterThan(0);
    expect(result.user.username).toBe('admin');

    const decoded = jwtService.verify(result.accessToken);
    expect(decoded.username).toBe('admin');
  });

  it('rejects incorrect username with generic UnauthorizedException', async () => {
    await expect(
      authService.login({
        username: 'wrong_user',
        password: testPassword,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects incorrect password with generic UnauthorizedException', async () => {
    await expect(
      authService.login({
        username: 'admin',
        password: 'wrong_password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('returns authenticated user profile via getMe', () => {
    const me = authService.getMe({ username: 'admin' });
    expect(me.username).toBe('admin');
    expect(me.authenticated).toBe(true);
  });
});
