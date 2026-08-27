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
      return new HttpException(
        {
          code: error.code,
          message: 'Dictionary lookup is temporarily rate limited.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (error.code === DictionaryErrorCode.TIMEOUT) {
      return new GatewayTimeoutException({
        code: error.code,
        message: 'The dictionary provider did not respond in time.',
      });
    }
    return new ServiceUnavailableException({
      code:
        error.code === DictionaryErrorCode.INVALID_PROVIDER_RESPONSE
          ? DictionaryErrorCode.PROVIDER_UNAVAILABLE
          : error.code,
      message: 'The dictionary service is temporarily unavailable.',
    });
  }

  return new ServiceUnavailableException({
    code: DictionaryErrorCode.PROVIDER_UNAVAILABLE,
    message: 'The dictionary service is temporarily unavailable.',
  });
}
