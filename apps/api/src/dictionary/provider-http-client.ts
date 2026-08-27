import { Injectable, Logger } from '@nestjs/common';
import { DictionaryErrorCode } from '@japanese-learning/contracts';
import { DictionaryProviderError, mapProviderError } from './dictionary-errors.js';

export const DEFAULT_PROVIDER_TIMEOUT_MS = 2_500;
export const DEFAULT_PROVIDER_MAX_RESPONSE_BYTES = 256 * 1024;
export const MAX_TRANSIENT_RETRIES = 1;

type FetchImplementation = (input: string, init?: RequestInit) => Promise<Response>;

export interface ProviderHttpClientOptions {
  fetchImpl?: FetchImplementation;
  timeoutMs?: number;
  maxResponseBytes?: number;
  retryDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
}

@Injectable()
export class ProviderHttpClient {
  private readonly logger = new Logger(ProviderHttpClient.name);
  private readonly fetchImpl: FetchImplementation;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly retryDelayMs: number;
  private readonly sleep: (delayMs: number) => Promise<void>;

  constructor(options: ProviderHttpClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
    this.maxResponseBytes = options.maxResponseBytes ?? DEFAULT_PROVIDER_MAX_RESPONSE_BYTES;
    this.retryDelayMs = options.retryDelayMs ?? 75;
    this.sleep =
      options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  }

  async getJson(provider: string, url: string): Promise<unknown | null> {
    let lastError: DictionaryProviderError | undefined;

    for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
      try {
        return await this.requestOnce(provider, url);
      } catch (error) {
        const mapped = mapProviderError(error, provider);
        lastError = mapped;
        const shouldRetry = mapped.retryable && attempt < MAX_TRANSIENT_RETRIES;
        if (!shouldRetry) throw mapped;
        this.logger.warn(
          `dictionary_provider_retry provider=${provider} code=${mapped.code} attempt=${attempt + 1}`,
        );
        await this.sleep(this.retryDelayMs * (attempt + 1));
      }
    }

    throw (
      lastError ??
      new DictionaryProviderError(
        DictionaryErrorCode.PROVIDER_UNAVAILABLE,
        provider,
        undefined,
        false,
      )
    );
  }

  private async requestOnce(provider: string, url: string): Promise<unknown | null> {
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      let response: Response;
      try {
        response = await this.fetchImpl(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'User-Agent': 'JapaneseStudyHub/phase3-provider-client',
          },
          signal: controller.signal,
        });
      } catch (error) {
        if (timedOut) {
          throw new DictionaryProviderError(
            DictionaryErrorCode.TIMEOUT,
            provider,
            undefined,
            true,
            error,
          );
        }
        throw new DictionaryProviderError(
          DictionaryErrorCode.PROVIDER_UNAVAILABLE,
          provider,
          undefined,
          true,
          error,
        );
      }

      if (response.status === 404) return null;
      if (response.status === 429) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.RATE_LIMITED,
          provider,
          response.status,
          false,
        );
      }
      if (response.status === 408) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.TIMEOUT,
          provider,
          response.status,
          true,
        );
      }
      if (response.status >= 500) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.PROVIDER_UNAVAILABLE,
          provider,
          response.status,
          true,
        );
      }
      if (!response.ok) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.PROVIDER_UNAVAILABLE,
          provider,
          response.status,
          false,
        );
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && Number.parseInt(contentLength, 10) > this.maxResponseBytes) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.INVALID_PROVIDER_RESPONSE,
          provider,
          response.status,
          false,
        );
      }

      const body = await response.text();
      const bodyBytes = new TextEncoder().encode(body).byteLength;
      if (bodyBytes > this.maxResponseBytes) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.INVALID_PROVIDER_RESPONSE,
          provider,
          response.status,
          false,
        );
      }
      try {
        return JSON.parse(body) as unknown;
      } catch (error) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.INVALID_PROVIDER_RESPONSE,
          provider,
          response.status,
          false,
          error,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }
}
