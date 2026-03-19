import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // Let TanStack Query handle cancellation — re-throw AbortError without toast
  if (options.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const url = `${API_URL}/api/v1${path}`;
  const headers = await getAuthHeaders();

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[API] ${options.method || 'GET'} ${url}`);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      signal: options.signal,
    });
  } catch (err) {
    // Re-throw AbortError directly — TanStack Query handles this gracefully
    if (err instanceof Error && err.name === 'AbortError') throw err;
    throw err;
  }

  if (process.env.NODE_ENV === 'development') {
    console.debug(`[API] ${response.status} ${url}`);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    const message = error.message || `HTTP ${response.status}`;

    if (response.status === 401) {
      toast.error('Session expired. Redirecting to login...');
      window.location.href = '/login';
    } else {
      toast.error(message);
    }

    throw new Error(message);
  }

  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text);
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
