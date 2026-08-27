import {
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DictionaryErrorCode } from '@japanese-learning/contracts';
import { DictionaryDomainError } from './dictionary-domain-error.js';
import { DictionaryProviderError } from './dictionary-errors.js';

export function toDictionaryHttpException(error: unknown): HttpException {
  if (error instanceof HttpException) return error;

  if (error instanceof DictionaryDomainError) {
    if (error.code === DictionaryErrorCode.INVALID_QUERY) {
      return new BadRequestException({
        code: error.code,
        message: 'The dictionary query is invalid.',
      });
    }
    if (error.code === DictionaryErrorCode.NO_RESULT) {
      return new NotFoundException({
        code: error.code,
        message: 'No dictionary result was found.',
      });
    }
  }

  if (error instanceof DictionaryProviderError) {
    if (error.code === DictionaryErrorCode.RATE_LIMITED) {
      return withRetryAfter(
        new HttpException(
          {
            code: error.code,
            message: 'Dictionary lookup is temporarily rate limited.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
        error.retryAfterSeconds,
      );
    }
    if (error.code === DictionaryErrorCode.TIMEOUT) {
      return withRetryAfter(
        new GatewayTimeoutException({
          code: error.code,
          message: 'The dictionary provider did not respond in time.',
        }),
        error.retryAfterSeconds,
      );
    }
    return withRetryAfter(
      new ServiceUnavailableException({
        code:
          error.code === DictionaryErrorCode.INVALID_PROVIDER_RESPONSE
            ? DictionaryErrorCode.PROVIDER_UNAVAILABLE
            : error.code,
        message: 'The dictionary service is temporarily unavailable.',
      }),
      error.retryAfterSeconds,
    );
  }

  return new ServiceUnavailableException({
    code: DictionaryErrorCode.PROVIDER_UNAVAILABLE,
    message: 'The dictionary service is temporarily unavailable.',
  });
}

function withRetryAfter(exception: HttpException, retryAfterSeconds?: number): HttpException {
  if (retryAfterSeconds === undefined || !Number.isFinite(retryAfterSeconds)) return exception;
  Object.defineProperty(exception, 'retryAfterSeconds', {
    configurable: true,
    enumerable: false,
    value: Math.max(0, Math.ceil(retryAfterSeconds)),
  });
  return exception;
}
