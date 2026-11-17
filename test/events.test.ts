import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('events', () => {
  it('sends a custom event with an email recipient', async () => {
    const { calls } = mockFetch(() => jsonResponse(202, {
      created: true,
      event: { id: 'evt-1', event: 'user.created', email: 'ada@example.com' }
    }));
    const notideus = new Notideus('nt_live_k');
    const result = await notideus.events.send({
      event: 'user.created',
      email: 'ada@example.com',
      payload: { first_name: 'Ada', plan: 'Pro' },
      idempotency_key: 'signup-42'
    });
    expect(result.created).toBe(true);
    expect(result.event.id).toBe('evt-1');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/events/send');
    expect(calls[0].init.method).toBe('POST');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual({
      event: 'user.created',
      email: 'ada@example.com',
      payload: { first_name: 'Ada', plan: 'Pro' },
      idempotency_key: 'signup-42'
    });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer nt_live_k');
  });

  it('accepts a contact ID and preserves the replay result', async () => {
    mockFetch(() => jsonResponse(202, {
      created: false,
      event: { id: 'evt-1', event: 'user.created', contact_id: 'contact-1' }
    }));
    const notideus = new Notideus('nt_live_k');
    const result = await notideus.events.send({ event: 'user.created', contact_id: 'contact-1' });
    expect(result.created).toBe(false);
    expect(result.event.contact_id).toBe('contact-1');
  });
});
