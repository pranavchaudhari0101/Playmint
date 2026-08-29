/**
 * ─── HTTP client ───────────────────────────────────────────────────
 * Thin fetch wrapper that:
 *   - prefixes /api (proxied to the backend by vite.config.ts)
 *   - attaches the bearer token
 *   - unwraps the backend's { error: { code, message, details } } envelope
 *     into a typed ApiClientError
 *   - notifies subscribers on 401 so the app can drop to the login screen
 * ──────────────────────────────────────────────────────────────────
 */

const TOKEN_KEY = 'sparks.token';

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }

  /** INSUFFICIENT_SPARKS carries { needed, available }. */
  get sparkShortfall(): { needed: number; available: number } | null {
    if (this.code !== 'INSUFFICIENT_SPARKS') return null;
    const d = this.details as { needed?: number; available?: number } | undefined;
    if (typeof d?.needed !== 'number' || typeof d?.available !== 'number') return null;
    return { needed: d.needed, available: d.available };
  }
}

// ─── Token storage ──────────────────────────────────────────────────

let token: string | null = null;

export function getToken(): string | null {
  if (token === null) token = localStorage.getItem(TOKEN_KEY);
  return token;
}

export function setToken(next: string | null): void {
  token = next;
  if (next) localStorage.setItem(TOKEN_KEY, next);
  else localStorage.removeItem(TOKEN_KEY);
}

// ─── Unauthorized subscribers ───────────────────────────────────────

type UnauthorizedHandler = () => void;
const unauthorizedHandlers = new Set<UnauthorizedHandler>();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => unauthorizedHandlers.delete(handler);
}

// ─── Core request ───────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip the 401 broadcast — used by the login screen itself. */
  silentUnauthorized?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = `/api${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, silentUnauthorized } = options;

  const headers: Record<string, string> = {};
  const bearer = getToken();
  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK', 'Cannot reach the API. Is the backend running on :4000?');
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new ApiClientError(response.status, 'BAD_RESPONSE', 'API returned a non-JSON response');
    }
  }

  if (!response.ok) {
    const envelope = payload as { error?: { code?: string; message?: string; details?: unknown } };
    const error = new ApiClientError(
      response.status,
      envelope?.error?.code ?? 'UNKNOWN',
      envelope?.error?.message ?? `Request failed with status ${response.status}`,
      envelope?.error?.details,
    );
    if (response.status === 401 && !silentUnauthorized) {
      setToken(null);
      for (const handler of unauthorizedHandlers) handler();
    }
    throw error;
  }

  return payload as T;
}

/** Stable idempotency key for a gameplay earn event. */
export function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `evt-${Math.random().toString(36).slice(2)}-${performance.now().toString(36)}`;
}
