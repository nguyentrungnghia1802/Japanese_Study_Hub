import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';
import type { Observable } from 'rxjs';

export const DEFAULT_SLOW_REQUEST_MS = 1000;

type RequestWithOptionalRoute = Request & {
  route?: {
    path?: string | string[];
  };
  id?: string;
};

function getSlowRequestThreshold(rawValue?: string): number {
  const parsed = Number.parseInt(rawValue ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SLOW_REQUEST_MS;
}

export function getSafeRoute(request: RequestWithOptionalRoute): string {
  const routePath = request.route?.path;
  if (typeof routePath !== 'string') {
    return 'unmatched';
  }

  const baseUrl = request.baseUrl || '';
  return (baseUrl + '/' + routePath).replace(/\/+/g, '/').replace(/\/{2,}/g, '/');
}

export function getSafeFailureEvent(
  request: RequestWithOptionalRoute,
  statusCode: number,
): string | undefined {
  if (statusCode < 400 || request.method !== 'POST') {
    return undefined;
  }

  const route = getSafeRoute(request);
  if (route.includes('/auth/login')) return 'failed_login';
  if (route.includes('/imports/')) return 'failed_import';
  if (route.includes('/attempts/') && route.endsWith('/submit')) {
    return 'failed_exam_submit';
  }
  return undefined;
}

@Injectable()
export class RequestObservabilityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestObservabilityInterceptor.name);
  private readonly slowRequestThresholdMs = getSlowRequestThreshold(process.env.SLOW_REQUEST_MS);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithOptionalRoute>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.record(request, response, startedAt),
        error: () => this.record(request, response, startedAt),
      }),
    );
  }

  private record(request: RequestWithOptionalRoute, response: Response, startedAt: number): void {
    const durationMs = Math.max(0, Date.now() - startedAt);
    const statusCode = response.statusCode || 200;
    const route = getSafeRoute(request);
    const requestId = request.id || 'missing';
    const fields =
      'method=' +
      request.method +
      ' route=' +
      route +
      ' status=' +
      statusCode +
      ' duration_ms=' +
      durationMs +
      ' request_id=' +
      requestId;

    this.logger.log('request ' + fields);

    if (durationMs >= this.slowRequestThresholdMs) {
      this.logger.warn('slow_request threshold_ms=' + this.slowRequestThresholdMs + ' ' + fields);
    }

    const failureEvent = getSafeFailureEvent(request, statusCode);
    if (failureEvent) {
      this.logger.warn(failureEvent + ' ' + fields);
    }
  }
}
