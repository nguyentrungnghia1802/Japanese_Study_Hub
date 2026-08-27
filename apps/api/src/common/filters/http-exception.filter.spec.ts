import { describe, it, expect, vi } from 'vitest';
import { ArgumentsHost, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './http-exception.filter.js';

describe('GlobalHttpExceptionFilter (TASK-011 / ERR-001)', () => {
  it('formats HttpException into standard API error envelope', () => {
    const filter = new GlobalHttpExceptionFilter();

    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ id: 'test-req-123' }),
      }),
    } as unknown as ArgumentsHost;

    const exception = new BadRequestException('Invalid input payload');
    filter.catch(exception, mockHost);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid input payload',
        details: null,
        requestId: 'test-req-123',
      },
    });
  });

  it('forwards a bounded provider Retry-After hint without exposing provider internals', () => {
    const filter = new GlobalHttpExceptionFilter();
    const jsonMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    const setHeaderMock = vi.fn();
    const mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock, setHeader: setHeaderMock }),
        getRequest: () => ({ id: 'retry-req' }),
      }),
    } as unknown as ArgumentsHost;
    const exception = new HttpException(
      { code: 'RATE_LIMITED', message: 'try later' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
    Object.defineProperty(exception, 'retryAfterSeconds', { value: 12 });

    filter.catch(exception, mockHost);

    expect(setHeaderMock).toHaveBeenCalledWith('Retry-After', '12');
    expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(Object) }));
  });
});
