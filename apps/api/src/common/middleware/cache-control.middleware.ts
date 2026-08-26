import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const PRIVATE_REVALIDATION_CACHE_CONTROL = 'private, no-cache';
export const NO_STORE_CACHE_CONTROL = 'no-store';

export type CachePolicy = 'private-revalidation' | 'no-store';

/**
 * Authenticated learning data can be revalidated by the owning browser, but it
 * must never be stored by a shared cache. Rapid/live state and downloads are
 * intentionally excluded because stale data or retained content is surprising.
 */
export function getResponseCachePolicy(method: string, path: string): CachePolicy {
  if (method !== 'GET' && method !== 'HEAD') return 'no-store';

  const normalizedPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  const noStorePath =
    normalizedPath === '/health' ||
    normalizedPath === '/health/ready' ||
    normalizedPath.includes('/auth') ||
    normalizedPath.includes('/attempts') ||
    normalizedPath.includes('/live-attempts') ||
    normalizedPath.endsWith('/export');

  return noStorePath ? 'no-store' : 'private-revalidation';
}

@Injectable()
export class CacheControlMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req.originalUrl || req.url;
    const policy = getResponseCachePolicy(req.method, path);

    // Authorization is part of the response identity. `private` protects the
    // response from shared caches; Vary also prevents key collisions upstream.
    res.setHeader('Vary', 'Authorization');
    res.setHeader(
      'Cache-Control',
      policy === 'private-revalidation'
        ? PRIVATE_REVALIDATION_CACHE_CONTROL
        : NO_STORE_CACHE_CONTROL,
    );

    next();
  }
}
