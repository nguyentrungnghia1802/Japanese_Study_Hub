import { describe, it, expect, vi } from 'vitest';
import { BadRequestException, ArgumentsHost } from '@nestjs/common';
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
});
