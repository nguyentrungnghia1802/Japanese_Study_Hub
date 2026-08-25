import * as SecureStore from 'expo-secure-store';
import { ApiErrorResponseDto } from '@japanese-learning/contracts';

declare const process: { env: Record<string, string | undefined> };

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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

async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('auth_token');
  } catch {
    return null;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

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
