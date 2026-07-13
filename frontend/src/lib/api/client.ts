const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

// The access/refresh tokens are httpOnly cookies set by the API — this
// client never touches them directly. When a request comes back 401 (access
// token expired), we make one attempt to refresh the session and replay the
// original request; only if that also fails do we treat the user as
// logged out. Concurrent 401s share a single in-flight refresh so a burst of
// requests doesn't fire the refresh endpoint N times.
let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshPromise ??= fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

function notifySessionExpired(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kontora:session-expired"));
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Internal: prevents infinite retry loops after a refresh attempt. */
  _isRetry?: boolean;
}

const NO_RETRY_PATHS = ["/api/auth/refresh", "/api/auth/login", "/api/auth/register"];

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { _isRetry, ...init } = options;
  const isFormData = init.body instanceof FormData;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
  });

  if (res.status === 401 && !_isRetry && !NO_RETRY_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _isRetry: true });
    }
    notifySessionExpired();
    throw new ApiError(401, "Unauthorized", "Your session has expired. Please log in again.");
  }

  if (!res.ok) {
    let body: { error?: string; message?: string } = {};
    try {
      body = await res.json();
    } catch {
      // non-JSON error body — fall through to statusText
    }
    throw new ApiError(res.status, body.error ?? "Error", body.message ?? res.statusText);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}
