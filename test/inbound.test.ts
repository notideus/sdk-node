import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus, NotideusError } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const routeFixture = {
  id: 'rt_7a2c',
  domain_id: 'dom_1',
  recipient: 'inbound',
  name: 'Support inbox',
  webhook_endpoint_id: '5c1e',
  store: true,
  status: 'active',
  created_at: '2026-09-10T12:00:00Z',
  updated_at: '2026-09-10T12:00:00Z'
};

const messageFixture = {
  id: 'im_3f9a',
  route_id: 'rt_7a2c',
  from_addr: 'jane@example.com',
  from_name: 'Jane',
  to_addr: 'inbound@in.notideus.io',
  subject: 'Hello',
  text: 'Hi there',
  html: '<p>Hi there</p>',
  headers: { 'X-Test': '1' },
  attachments: [{ name: 'report.csv', content_type: 'text/csv', size_kb: 12, key: 'att_1' }],
  spam_verdict: null,
  size_kb: 45,
  status: 'received',
  error: null,
  received_at: '2026-09-10T12:00:00Z'
};

describe('inbound routes', () => {
  it('lists routes and returns the data + meta envelope whole', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, { data: [routeFixture], meta: { simulate_enabled: true, retention_days: 30 } })
    );
    const notideus = new Notideus('k');
    const res = await notideus.inbound.routes.list();
    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe('rt_7a2c');
    expect(res.meta).toEqual({ simulate_enabled: true, retention_days: 30 });
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/routes');
  });

  it('creates a route, dropping undefined optional fields from the body', async () => {
    const { calls } = mockFetch(() => jsonResponse(201, { route: routeFixture }));
    const notideus = new Notideus('k');
    const route = await notideus.inbound.routes.create({
      domain_id: 'dom_1',
      recipient: 'inbound',
      name: undefined,
      store: true,
      webhook_endpoint_id: undefined
    });
    expect(route.id).toBe('rt_7a2c');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/routes');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      domain_id: 'dom_1',
      recipient: 'inbound',
      store: true
    });
  });

  it('gets a route by id and unwraps {route}', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { route: routeFixture }));
    const notideus = new Notideus('k');
    const route = await notideus.inbound.routes.get('rt_7a2c');
    expect(route.status).toBe('active');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/routes/rt_7a2c');
  });

  it('updates a route, sending only the provided optional fields', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { route: routeFixture }));
    const notideus = new Notideus('k');
    await notideus.inbound.routes.update('rt_7a2c', {
      recipient: 'support',
      store: false,
      webhook_endpoint_id: undefined
    });
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/routes/rt_7a2c');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ recipient: 'support', store: false });
  });

  it('deletes a route and resolves undefined on 204', async () => {
    const { calls } = mockFetch(() => new Response(null, { status: 204 }));
    const notideus = new Notideus('k');
    await expect(notideus.inbound.routes.delete('rt_7a2c')).resolves.toBeUndefined();
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/routes/rt_7a2c');
  });
});

describe('inbound messages', () => {
  it('lists messages with q and route_id filters', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, { data: [messageFixture], next_cursor: '20' })
    );
    const notideus = new Notideus('k');
    const page = await notideus.inbound.messages.list({ q: 'hello', route_id: 'rt_7a2c', cursor: '0', limit: 20 });
    expect(page.data).toHaveLength(1);
    expect(page.data[0].id).toBe('im_3f9a');
    expect(page.next_cursor).toBe('20');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe(
      'https://api.notideus.io/v1/inbound/messages?q=hello&route_id=rt_7a2c&cursor=0&limit=20'
    );
  });

  it('gets a message by id and unwraps {message}', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { message: messageFixture }));
    const notideus = new Notideus('k');
    const message = await notideus.inbound.messages.get('im_3f9a');
    expect(message.subject).toBe('Hello');
    expect(message.attachments[0].key).toBe('att_1');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/messages/im_3f9a');
  });

  it('downloads the raw MIME and parses filename + content type + bytes', async () => {
    const { calls } = mockFetch(
      () =>
        new Response(new Uint8Array([82, 97, 119]), {
          status: 200,
          headers: {
            'Content-Type': 'message/rfc822',
            'Content-Disposition': 'attachment; filename="raw.eml"'
          }
        })
    );
    const notideus = new Notideus('k');
    const res = await notideus.inbound.messages.raw('im_3f9a');
    expect(Array.from(res.data)).toEqual([82, 97, 119]);
    expect(res.contentType).toBe('message/rfc822');
    expect(res.filename).toBe('raw.eml');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/messages/im_3f9a/raw');
  });

  it('downloads an attachment by index', async () => {
    const { calls } = mockFetch(
      () =>
        new Response(new Uint8Array([97, 98, 99]), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="report.csv"'
          }
        })
    );
    const notideus = new Notideus('k');
    const res = await notideus.inbound.messages.attachment('im_3f9a', 0);
    expect(Array.from(res.data)).toEqual([97, 98, 99]);
    expect(res.contentType).toBe('text/csv');
    expect(res.filename).toBe('report.csv');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/inbound/messages/im_3f9a/attachments/0');
  });

  it('parses a filename without quotes', async () => {
    mockFetch(
      () =>
        new Response(new Uint8Array([1]), {
          status: 200,
          headers: { 'Content-Disposition': 'attachment; filename=plain.txt' }
        })
    );
    const notideus = new Notideus('k');
    const res = await notideus.inbound.messages.attachment('im_3f9a', 1);
    expect(res.filename).toBe('plain.txt');
  });

  it('returns null filename when Content-Disposition is absent', async () => {
    mockFetch(() => new Response(new Uint8Array([1]), { status: 200 }));
    const notideus = new Notideus('k');
    const res = await notideus.inbound.messages.raw('im_3f9a');
    expect(res.filename).toBeNull();
    expect(res.contentType).toBe('application/octet-stream');
  });

  it('raises NotideusError from the standard envelope on non-2xx binary responses', async () => {
    mockFetch(() => jsonResponse(404, { error: { code: 'not_found', message: 'no such message' } }));
    const notideus = new Notideus('k');
    const err: NotideusError = (await notideus.inbound.messages
      .raw('im_3f9a')
      .catch((e: unknown) => e)) as NotideusError;
    expect(err).toBeInstanceOf(NotideusError);
    expect(err.code).toBe('not_found');
    expect(err.status).toBe(404);
    expect(err.message).toBe('no such message');
  });
});
