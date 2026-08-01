// Remote API base — sync worker + AI endpoints
// API_BASE / CLIENT_SECRET are injected at build time (NEXT_PUBLIC_*)

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';
export const CLIENT_SECRET = process.env.NEXT_PUBLIC_CLIENT_SECRET || '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (CLIENT_SECRET) headers.set('X-Client-Secret', CLIENT_SECRET);
  const res = await fetch(apiUrl(path), { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`API ${path} failed (${res.status}): ${(err as { error?: string }).error ?? res.statusText}`);
  }
  return res;
}
