import { DictionaryErrorCode } from '@japanese-learning/contracts';

export class DictionaryProviderError extends Error {
  constructor(
    public readonly code: DictionaryErrorCode,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly retryable = false,
    cause?: unknown,
    public readonly retryAfterSeconds?: number,
  ) {
    super(`Dictionary provider operation failed: ${code}`, { cause });
    this.name = 'DictionaryProviderError';
  }
}

export function mapProviderError(error: unknown, provider: string): DictionaryProviderError {
  if (error instanceof DictionaryProviderError) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new DictionaryProviderError(
      DictionaryErrorCode.TIMEOUT,
      provider,
      undefined,
      true,
      error,
    );
  }
  return new DictionaryProviderError(
    DictionaryErrorCode.PROVIDER_UNAVAILABLE,
    provider,
    undefined,
    true,
    error,
  );
}
