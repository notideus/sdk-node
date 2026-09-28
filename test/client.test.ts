import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../src/client.js';
import { NotideusError } from '../src/errors.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiClient', () => {
  it('POSTs JSON with bearer auth, user-agent and content-type', async () => {
    const { calls } = mockFetch(() => jsonResponse(201, { id: 'abc' }));
    const client = new ApiClient({ apiKey: 'nt_live_test' });
    const result = await client.request<{ id: string }>('POST', '/v1/emails', {
      body: { subject: 'Hi' }
    });
    expect(result.id).toBe('abc');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.notideus.io/v1/emails');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBe(JSON.stringify({ subject: 'Hi' }));
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer nt_live_test');
    expect(headers['User-Agent']).toBe('notideus-node/0.1.0');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits Authorization for unauthenticated requests and for keyless clients', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, {}));
    const client = new ApiClient();
    await client.request('GET', '/v1/plans', { authenticated: false });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('omits Authorization for authenticated:false requests even when a key is set', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, {}));
    const client = new ApiClient({ apiKey: 'nt_live_secret' });
    await client.request('GET', '/v1/plans', { authenticated: false });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('serializes query params, dropping undefined values', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { data: [] }));
    const client = new ApiClient({ apiKey: 'k', baseURL: 'http://localhost:8080' });
    await client.request('GET', '/v1/contacts', {
      query: { limit: 50, status: 'subscribed', cursor: undefined }
    });
    expect(calls[0].url).toBe('http://localhost:8080/v1/contacts?limit=50&status=subscribed');
  });

  it('throws NotideusError from the error envelope', async () => {
    mockFetch(() =>
      jsonResponse(422, {
        error: { code: 'from_domain_not_verified', message: 'no verified domain matches the from address' }
      })
    );
    const client = new ApiClient({ apiKey: 'k', maxRetries: 0 });
    const err: NotideusError = (await client
      .request('POST', '/v1/emails', { body: {} })
      .catch((e: unknown) => e)) as NotideusError;
    expect(err).toBeInstanceOf(NotideusError);
    expect(err.code).toBe('from_domain_not_verified');
    expect(err.status).toBe(422);
    expect(err.message).toBe('no verified domain matches the from address');
  });

  it('parses Retry-After on 429', async () => {
    mockFetch(() =>
      jsonResponse(429, { error: { code: 'rate_limited', message: 'slow down' } }, { 'Retry-After': '7' })
    );
    const client = new ApiClient({ apiKey: 'k', maxRetries: 0 });
    const err: NotideusError = (await client
      .request('GET', '/v1/contacts')
      .catch((e: unknown) => e)) as NotideusError;
    expect(err.code).toBe('rate_limited');
    expect(err.retryAfter).toBe(7);
  });

  it('returns undefined for 204 responses', async () => {
    mockFetch(() => new Response(null, { status: 204 }));
    const client = new ApiClient({ apiKey: 'k' });
    await expect(client.request('DELETE', '/v1/contacts/a@b.c')).resolves.toBeUndefined();
  });

  it('wraps fetch network failures in NotideusError with status 0', async () => {
    mockFetch(() => {
      throw new TypeError('fetch failed');
    });
    const client = new ApiClient({ apiKey: 'k', maxRetries: 0 });
    const err: NotideusError = (await client
      .request('GET', '/v1/contacts')
      .catch((e: unknown) => e)) as NotideusError;
    expect(err).toBeInstanceOf(NotideusError);
    expect(err.code).toBe('network_error');
    expect(err.status).toBe(0);
  });
});

function sequence(...handlers: ((url: string, init: RequestInit) => Response)[]) {
  let i = 0;
  return () => handlers[Math.min(i++, handlers.length - 1)]('', {});
}

describe('retry', () => {
  it('retries 429 honoring Retry-After', async () => {
    const slept: number[] = [];
    const { calls } = mockFetch(
      sequence(
        () => jsonResponse(429, { error: { code: 'rate_limited', message: 'slow' } }, { 'Retry-After': '2' }),
        () => jsonResponse(200, { ok: true })
      )
    );
    const client = new ApiClient({
      apiKey: 'k',
      sleep: (ms) => {
        slept.push(ms);
        return Promise.resolve();
      }
    });
    const res = await client.request<{ ok: boolean }>('GET', '/v1/contacts');
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(2);
    expect(slept).toEqual([2000]);
  });

  it('retries 5xx with exponential backoff and jitter', async () => {
    const slept: number[] = [];
    const { calls } = mockFetch(
      sequence(
        () => jsonResponse(500, { error: { code: 'internal', message: 'boom' } }),
        () => jsonResponse(500, { error: { code: 'internal', message: 'boom' } }),
        () => jsonResponse(200, { ok: true })
      )
    );
    const client = new ApiClient({
      apiKey: 'k',
      sleep: (ms) => {
        slept.push(ms);
        return Promise.resolve();
      }
    });
    await client.request('GET', '/v1/contacts');
    expect(calls).toHaveLength(3);
    expect(slept[0]).toBeGreaterThanOrEqual(1000);
    expect(slept[0]).toBeLessThan(1500);
    expect(slept[1]).toBeGreaterThanOrEqual(2000);
    expect(slept[1]).toBeLessThan(2500);
  });

  it('retries network errors', async () => {
    const { calls } = mockFetch(
      sequence(
        () => {
          throw new TypeError('fetch failed');
        },
        () => jsonResponse(200, { ok: true })
      )
    );
    const client = new ApiClient({ apiKey: 'k', sleep: () => Promise.resolve() });
    const res = await client.request<{ ok: boolean }>('GET', '/v1/contacts');
    expect(res.ok).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('does not retry POST sends without an idempotency key', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(429, { error: { code: 'rate_limited', message: 'slow' } }, { 'Retry-After': '1' })
    );
    const client = new ApiClient({ apiKey: 'k', sleep: () => Promise.resolve() });
    await expect(
      client.request('POST', '/v1/emails', { body: { subject: 'x' } })
    ).rejects.toMatchObject({ code: 'rate_limited' });
    expect(calls).toHaveLength(1);
  });

  it('retries POST sends that carry an idempotency key', async () => {
    const { calls } = mockFetch(
      sequence(
        () => jsonResponse(500, { error: { code: 'internal', message: 'boom' } }),
        () => jsonResponse(201, { id: 'e1' })
      )
    );
    const client = new ApiClient({ apiKey: 'k', sleep: () => Promise.resolve() });
    const res = await client.request<{ id: string }>('POST', '/v1/emails', {
      body: { subject: 'x', idempotency_key: 'req-1' }
    });
    expect(res.id).toBe('e1');
    expect(calls).toHaveLength(2);
  });

  it('does not retry contact write POSTs (no idempotency support)', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(500, { error: { code: 'internal', message: 'boom' } })
    );
    const client = new ApiClient({ apiKey: 'k', sleep: () => Promise.resolve() });
    await expect(client.request('POST', '/v1/contacts', { body: { email: 'j@x.co' } })).rejects.toMatchObject({
      code: 'internal'
    });
    expect(calls).toHaveLength(1);
  });

  it('stops after maxRetries and surfaces the last error', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(429, { error: { code: 'rate_limited', message: 'slow' } }, { 'Retry-After': '1' })
    );
    const client = new ApiClient({ apiKey: 'k', maxRetries: 1, sleep: () => Promise.resolve() });
    await expect(client.request('GET', '/v1/contacts')).rejects.toMatchObject({ code: 'rate_limited' });
    expect(calls).toHaveLength(2);
  });
});
