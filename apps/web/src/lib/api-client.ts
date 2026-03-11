import type { ApiResponse, PaginatedResponse } from '@arcadiux/shared/types';

const BASE_URL = '';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- In-memory token (never stored in localStorage) ---
let inMemoryAccessToken: string | null = null;

function getToken(): string | null {
  return inMemoryAccessToken;
}

function setTokens(accessToken: string): void {
  inMemoryAccessToken = accessToken;
}

function clearTokens(): void {
  inMemoryAccessToken = null;
}

async function clearTokensAndLogout(): Promise<void> {
  inMemoryAccessToken = null;
  try {
    await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best effort — cookie may already be expired
  }
}

// --- Refresh token mutex ---
// Ensures only one refresh request is in-flight at a time.
// Concurrent 401s will all wait for the same refresh result.
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // sends httpOnly cookie automatically
      });

      if (!res.ok) return false;

      const json = (await res.json()) as {
        data: { accessToken: string };
      };
      setTokens(json.data.accessToken);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// --- Silent refresh on page load (cookie present but in-memory token lost) ---

let silentRefreshDone = false;

async function ensureAccessToken(): Promise<void> {
  if (inMemoryAccessToken || silentRefreshDone) return;
  silentRefreshDone = true;
  await refreshAccessToken();
}

// --- Core fetch wrapper with auto-refresh ---

async function fetchWithAuth<T>(
  url: string,
  init: RequestInit,
): Promise<T> {
  // On first request after page load, attempt silent refresh if needed
  await ensureAccessToken();

  let response = await fetch(url, init);

  // On 401, attempt a single token refresh then retry
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Rebuild headers with the new token
      const newHeaders = { ...Object.fromEntries(new Headers(init.headers).entries()) };
      const newToken = getToken();
      if (newToken) {
        newHeaders['Authorization'] = `Bearer ${newToken}`;
      }
      response = await fetch(url, { ...init, headers: newHeaders });
    }
  }

  // If still 401 after refresh attempt, clear session and redirect
  if (response.status === 401) {
    clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Unauthorized');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      (errorData as { message?: string }).message ?? `Request failed with status ${response.status}`,
      errorData,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Helpers ---

function buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

export const apiClient = {
  async get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return fetchWithAuth<T>(buildUrl(path, params), {
      method: 'GET',
      headers: buildHeaders(),
    });
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    return fetchWithAuth<T>(buildUrl(path), {
      method: 'POST',
      headers: buildHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    return fetchWithAuth<T>(buildUrl(path), {
      method: 'PUT',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return fetchWithAuth<T>(buildUrl(path), {
      method: 'PATCH',
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  async delete<T>(path: string): Promise<T> {
    return fetchWithAuth<T>(buildUrl(path), {
      method: 'DELETE',
      headers: buildHeaders(),
    });
  },

  async upload<T>(path: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetchWithAuth<T>(buildUrl(path), {
      method: 'POST',
      headers,
      body: formData,
    });
  },
};

export { ApiError, getToken, setTokens, clearTokens, clearTokensAndLogout, refreshAccessToken };
export type { ApiResponse, PaginatedResponse };
