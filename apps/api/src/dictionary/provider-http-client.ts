import { Injectable, Logger } from '@nestjs/common';
import { DictionaryErrorCode } from '@japanese-learning/contracts';
import { DictionaryProviderError, mapProviderError } from './dictionary-errors.js';

export const DEFAULT_PROVIDER_TIMEOUT_MS = 2_500;
export const DEFAULT_PROVIDER_MAX_RESPONSE_BYTES = 256 * 1024;
export const MAX_TRANSIENT_RETRIES = 1;
export const MAX_PROVIDER_FAILURE_STATES = 16;
export const PROVIDER_FAILURE_THRESHOLD = 3;
export const PROVIDER_FAILURE_COOLDOWN_MS = 5_000;

type FetchImplementation = (input: string, init?: RequestInit) => Promise<Response>;

export interface ProviderHttpClientOptions {
  fetchImpl?: FetchImplementation;
  timeoutMs?: number;
  maxResponseBytes?: number;
  retryDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
}

interface ProviderFailureState {
  consecutiveFailures: number;
  openUntil: number;
  code: DictionaryErrorCode;
}

@Injectable()
export class ProviderHttpClient {
  private readonly logger = new Logger(ProviderHttpClient.name);
  private readonly fetchImpl: FetchImplementation;
  private readonly timeoutMs: number;
  private readonly maxResponseBytes: number;
  private readonly retryDelayMs: number;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly now: () => number;
  private readonly failureStates = new Map<string, ProviderFailureState>();

  constructor(options: ProviderHttpClientOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS;
    this.maxResponseBytes = options.maxResponseBytes ?? DEFAULT_PROVIDER_MAX_RESPONSE_BYTES;
    this.retryDelayMs = options.retryDelayMs ?? 75;
    this.sleep =
      options.sleep ?? ((delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)));
    this.now = options.now ?? Date.now;
  }

  async getJson(provider: string, url: string): Promise<unknown | null> {
    const circuitError = this.getCircuitError(provider);
    if (circuitError) throw circuitError;

    let lastError: DictionaryProviderError | undefined;

    for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
      try {
        return await this.requestOnce(provider, url);
      } catch (error) {
        const mapped = mapProviderError(error, provider);
        lastError = mapped;
        const shouldRetry =
          mapped.retryable &&
          mapped.retryAfterSeconds === undefined &&
          attempt < MAX_TRANSIENT_RETRIES;
        if (!shouldRetry) {
          this.recordFailure(provider, mapped);
          throw mapped;
        }
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

  private getCircuitError(provider: string): DictionaryProviderError | null {
    const state = this.failureStates.get(provider);
    if (!state) return null;
    if (state.openUntil === 0) return null;
    const remainingMs = state.openUntil - this.now();
    if (remainingMs <= 0) {
      this.failureStates.delete(provider);
      return null;
    }
    return new DictionaryProviderError(
      state.code,
      provider,
      state.code === DictionaryErrorCode.RATE_LIMITED ? 429 : undefined,
      false,
      undefined,
      Math.ceil(remainingMs / 1_000),
    );
  }

  private recordFailure(provider: string, error: DictionaryProviderError): void {
    const retryAfterMs =
      error.retryAfterSeconds !== undefined
        ? Math.max(0, error.retryAfterSeconds) * 1_000
        : undefined;
    if (
      (error.code === DictionaryErrorCode.RATE_LIMITED ||
        error.code === DictionaryErrorCode.TIMEOUT ||
        error.code === DictionaryErrorCode.PROVIDER_UNAVAILABLE) &&
      retryAfterMs !== undefined
    ) {
      this.setFailureState(provider, {
        consecutiveFailures: PROVIDER_FAILURE_THRESHOLD,
        openUntil: this.now() + retryAfterMs,
        code: error.code,
      });
      return;
    }

    if (
      error.code !== DictionaryErrorCode.TIMEOUT &&
      error.code !== DictionaryErrorCode.PROVIDER_UNAVAILABLE
    ) {
      return;
    }

    const previous = this.failureStates.get(provider);
    const consecutiveFailures = (previous?.consecutiveFailures ?? 0) + 1;
    if (consecutiveFailures < PROVIDER_FAILURE_THRESHOLD) {
      this.setFailureState(provider, {
        consecutiveFailures,
        openUntil: 0,
        code: DictionaryErrorCode.PROVIDER_UNAVAILABLE,
      });
      return;
    }
    this.setFailureState(provider, {
      consecutiveFailures,
      openUntil: this.now() + PROVIDER_FAILURE_COOLDOWN_MS,
      code: DictionaryErrorCode.PROVIDER_UNAVAILABLE,
    });
  }

  private setFailureState(provider: string, state: ProviderFailureState): void {
    if (
      !this.failureStates.has(provider) &&
      this.failureStates.size >= MAX_PROVIDER_FAILURE_STATES
    ) {
      const oldest = this.failureStates.keys().next().value;
      if (oldest) this.failureStates.delete(oldest);
    }
    this.failureStates.set(provider, state);
  }

  private clearFailure(provider: string): void {
    this.failureStates.delete(provider);
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

      if (response.status === 404) {
        this.clearFailure(provider);
        return null;
      }
      if (response.status === 429) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.RATE_LIMITED,
          provider,
          response.status,
          false,
          undefined,
          parseRetryAfterSeconds(response.headers, this.now()),
        );
      }
      if (response.status === 408) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.TIMEOUT,
          provider,
          response.status,
          true,
          undefined,
          parseRetryAfterSeconds(response.headers, this.now()),
        );
      }
      if (response.status >= 500) {
        throw new DictionaryProviderError(
          DictionaryErrorCode.PROVIDER_UNAVAILABLE,
          provider,
          response.status,
          true,
          undefined,
          parseRetryAfterSeconds(response.headers, this.now()),
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
      this.clearFailure(provider);
      try {
        const parsed = JSON.parse(body) as unknown;
        return parsed;
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

function parseRetryAfterSeconds(headers: Headers, nowMs: number): number | undefined {
  const retryAfter = headers.get('retry-after')?.trim();
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(Math.ceil(seconds), 3_600);
    const dateMs = Date.parse(retryAfter);
    if (Number.isFinite(dateMs)) {
      return Math.min(Math.max(0, Math.ceil((dateMs - nowMs) / 1_000)), 3_600);
    }
  }

  const reset = headers.get('x-ratelimit-reset')?.trim();
  const resetSeconds = reset ? Number(reset) : Number.NaN;
  if (Number.isFinite(resetSeconds) && resetSeconds >= 0) {
    const resetMs = resetSeconds > 3_600 ? resetSeconds * 1_000 : nowMs + resetSeconds * 1_000;
    return Math.min(Math.max(0, Math.ceil((resetMs - nowMs) / 1_000)), 3_600);
  }
  return undefined;
}
