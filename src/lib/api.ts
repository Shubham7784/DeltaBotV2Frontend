const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '') ?? '';

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${configuredApiBase}${normalizedPath}`;
}

export function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  if (!url.startsWith('/api/')) {
    return fetch(input, init);
  }
  return fetch(apiUrl(url), init);
}

export function apiWebSocketUrl(path: string): string {
  const apiBase = configuredApiBase || window.location.origin;
  const url = new URL(apiUrl(path), apiBase);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}
