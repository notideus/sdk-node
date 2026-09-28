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
