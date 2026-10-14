import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const endpointFixture = {
  id: '5c1e',
  name: 'Billing hooks',
  url: 'https://example.com/hooks/notideus',
  secret_prefix: 'whsec_9f2a',
  events: ['email.delivered'],
  status: 'active',
  created_at: '2026-09-10T12:00:00Z',
  updated_at: '2026-09-10T12:00:00Z'
};

const deliveryFixture = {
  id: '9d4b',
  endpoint_id: '5c1e',
  event_type: 'email.delivered',
  payload: { email_id: 'em_123' },
  status: 'success',
  attempts: 1,
  last_status_code: 200,
  last_error: null,
  delivered_at: '2026-09-10T12:00:01Z',
  created_at: '2026-09-10T12:00:00Z'
};

describe('webhooks', () => {
  it('lists endpoints and maps the page envelope', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, { data: [endpointFixture], next_cursor: '20' })
    );
    const notideus = new Notideus('k');
    const page = await notideus.webhooks.list({ limit: 20, cursor: '0' });
    expect(page.data).toHaveLength(1);
    expect(page.data[0].secret_prefix).toBe('whsec_9f2a');
    expect(page.next_cursor).toBe('20');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/webhooks?cursor=0&limit=20');
  });

  it('creates an endpoint and returns it with the plaintext secret', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(201, { endpoint: endpointFixture, secret: 'whsec_full_secret' })
    );
    const notideus = new Notideus('k');
    const created = await notideus.webhooks.create({
      name: 'Billing hooks',
      url: 'https://example.com/hooks/notideus',
      events: ['email.delivered']
    });
    expect(created.secret).toBe('whsec_full_secret');
    expect(created.endpoint.id).toBe('5c1e');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/webhooks');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'Billing hooks',
      url: 'https://example.com/hooks/notideus',
      events: ['email.delivered']
    });
  });

  it('gets an endpoint by id, URL-encoding the path segment', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { endpoint: endpointFixture }));
    const notideus = new Notideus('k');
    const endpoint = await notideus.webhooks.get('5c1e');
    expect(endpoint.id).toBe('5c1e');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/webhooks/5c1e');
  });

  it('updates an endpoint with all four fields', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { endpoint: endpointFixture }));
    const notideus = new Notideus('k');
    const endpoint = await notideus.webhooks.update('5c1e', {
      name: 'Billing hooks v2',
      url: 'https://example.com/hooks/notideus',
      events: ['email.delivered', 'email.bounced'],
      status: 'disabled'
    });
    expect(endpoint.id).toBe('5c1e');
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/webhooks/5c1e');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({
      name: 'Billing hooks v2',
      url: 'https://example.com/hooks/notideus',
      events: ['email.delivered', 'email.bounced'],
      status: 'disabled'
    });
  });

  it('deletes an endpoint and resolves undefined on 204', async () => {
    const { calls } = mockFetch(() => new Response(null, { status: 204 }));
    const notideus = new Notideus('k');
    await expect(notideus.webhooks.delete('5c1e')).resolves.toBeUndefined();
    expect(calls[0].init.method).toBe('DELETE');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/webhooks/5c1e');
  });

  it('tests an endpoint without an event and posts an empty body', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { delivery: deliveryFixture }));
    const notideus = new Notideus('k');
    const delivery = await notideus.webhooks.test('5c1e');
    expect(delivery.id).toBe('9d4b');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/webhooks/5c1e/test');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({});
  });

  it('tests an endpoint with an event and posts it', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { delivery: deliveryFixture }));
    const notideus = new Notideus('k');
    await notideus.webhooks.test('5c1e', 'email.delivered');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ event: 'email.delivered' });
  });

  it('lists event descriptors and unwraps data', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, { data: [{ type: 'email.delivered', description: '…', sample: { id: 'em_123' } }] })
    );
    const notideus = new Notideus('k');
    const events = await notideus.webhooks.events();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('email.delivered');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/webhooks/meta/events');
  });

  describe('deliveries', () => {
    it('lists deliveries with filters', async () => {
      const { calls } = mockFetch(() =>
        jsonResponse(200, { data: [deliveryFixture], next_cursor: '40' })
      );
      const notideus = new Notideus('k');
      const page = await notideus.webhooks.deliveries.list({
        endpoint_id: '5c1e',
        event_type: 'email.delivered',
        status: 'success',
        limit: 20,
        cursor: '0'
      });
      expect(page.data).toHaveLength(1);
      expect(page.data[0].endpoint_id).toBe('5c1e');
      expect(page.next_cursor).toBe('40');
      expect(calls[0].init.method).toBe('GET');
      expect(calls[0].url).toBe(
        'https://api.notideus.io/v1/webhook-deliveries?endpoint_id=5c1e&event_type=email.delivered&status=success&cursor=0&limit=20'
      );
    });

    it('gets a delivery with its attempts', async () => {
      const { calls } = mockFetch(() =>
        jsonResponse(200, {
          delivery: deliveryFixture,
          attempts: [
            {
              attempt: 1,
              status_code: 200,
              error: null,
              duration_ms: 120,
              created_at: '2026-09-10T12:00:01Z'
            }
          ]
        })
      );
      const notideus = new Notideus('k');
      const result = await notideus.webhooks.deliveries.get('9d4b');
      expect(result.delivery.id).toBe('9d4b');
      expect(result.attempts).toHaveLength(1);
      expect(result.attempts[0].status_code).toBe(200);
      expect(calls[0].init.method).toBe('GET');
      expect(calls[0].url).toBe('https://api.notideus.io/v1/webhook-deliveries/9d4b');
    });

    it('redelivers a delivery and returns it', async () => {
      const { calls } = mockFetch(() => jsonResponse(200, { delivery: deliveryFixture }));
      const notideus = new Notideus('k');
      const delivery = await notideus.webhooks.deliveries.redeliver('9d4b');
      expect(delivery.id).toBe('9d4b');
      expect(calls[0].init.method).toBe('POST');
      expect(calls[0].url).toBe('https://api.notideus.io/v1/webhook-deliveries/9d4b/redeliver');
    });
  });
});
