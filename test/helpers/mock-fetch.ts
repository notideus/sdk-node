import { vi } from 'vitest';

export interface RecordedCall {
  url: string;
  init: RequestInit;
}

export type FetchHandler = (url: string, init: RequestInit) => Response;

export function mockFetch(handler: FetchHandler): { calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fn = vi.fn((input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const requestInit: RequestInit = init ?? {};
    calls.push({ url, init: requestInit });
    return Promise.resolve(handler(url, requestInit));
  });
  vi.stubGlobal('fetch', fn);
  return { calls };
}

export function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}
