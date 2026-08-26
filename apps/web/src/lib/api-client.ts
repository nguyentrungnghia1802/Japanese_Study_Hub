import { ApiErrorResponseDto } from '@japanese-learning/contracts';

export const DEFAULT_API_BASE_URL = 'http://localhost:4000/api/v1';

export function resolveApiBaseUrl(value?: string): string {
  return value?.trim() || DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown> | null,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'An unexpected error occurred',
): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  // If payload is FormData, do not set Content-Type header manually
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return {} as T;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorBody = data as ApiErrorResponseDto;
    const code = errorBody?.error?.code || `HTTP_${res.status}`;
    const message = errorBody?.error?.message || res.statusText || 'An unexpected error occurred';
    const details = errorBody?.error?.details || null;
    throw new ApiError(code, message, details, res.status);
  }

  return data as T;
}
