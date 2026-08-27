import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponseDto } from '@japanese-learning/contracts';
import { RequestWithId } from '../middleware/request-id.middleware.js';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request?.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected server error occurred.';
    let details: Record<string, unknown> | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const retryAfterSeconds = (exception as HttpException & { retryAfterSeconds?: unknown })
        .retryAfterSeconds;
      if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds)) {
        response.setHeader('Retry-After', String(Math.ceil(Number(retryAfterSeconds))));
      }
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        code = this.statusCodeToErrorCode(status);
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
        if (resObj.code && typeof resObj.code === 'string') {
          code = resObj.code;
        } else {
          code = this.statusCodeToErrorCode(status);
        }

        if (resObj.details) {
          details = resObj.details as Record<string, unknown>;
        } else if (Array.isArray(resObj.message)) {
          // Class validator validation pipe array
          message = 'Validation failed';
          details = { validationErrors: resObj.message };
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception [${requestId}]: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(`Unknown Exception [${requestId}]: ${String(exception)}`);
    }

    const errorPayload: ApiErrorResponseDto = {
      error: {
        code,
        message,
        details,
        ...(requestId ? { requestId } : {}),
      },
    };

    response.status(status).json(errorPayload);
  }

  private statusCodeToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'PAYLOAD_TOO_LARGE';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
