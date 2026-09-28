import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const infoFixture = {
  email: 'jane@example.com',
  status: 'subscribed',
  team_name: 'Acme Inc',
  topics: [
    { id: '7b1c', name: 'product', display_name: 'Product news', subscribed: true },
    { id: '7b1d', name: 'digest', display_name: 'Weekly digest', subscribed: false }
  ]
};

describe('unsubscribe', () => {
  it('fetches unsubscribe info via the t query param without an Authorization header', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, infoFixture));
    const notideus = new Notideus();
    const info = await notideus.unsubscribe.info('550e8400-e29b-41d4-a716-446655440000');
    expect(info.team_name).toBe('Acme Inc');
    expect(info.topics).toHaveLength(2);
    expect(calls[0].url).toBe('https://api.notideus.io/v1/unsubscribe/info?t=550e8400-e29b-41d4-a716-446655440000');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('unsubscribes with a whole-contact JSON body (no topic_ids when omitted)', async () => {
    const { calls } = mockFetch(() => new Response(null, { status: 204 }));
    const notideus = new Notideus();
    await expect(notideus.unsubscribe.unsubscribe('tok')).resolves.toBeUndefined();
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/unsubscribe');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ token: 'tok' });
  });

  it('unsubscribes specific topics when topic_ids is given', async () => {
    const { calls } = mockFetch(() => new Response(null, { status: 204 }));
    const notideus = new Notideus();
    await notideus.unsubscribe.unsubscribe('tok', ['7b1c']);
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ token: 'tok', topic_ids: ['7b1c'] });
  });

  it('saves preferences with the desired subscribed set (empty = whole contact)', async () => {
    const { calls } = mockFetch(() => new Response(null, { status: 204 }));
    const notideus = new Notideus();
    await notideus.unsubscribe.preferences('tok', []);
    expect(calls[0].url).toBe('https://api.notideus.io/v1/unsubscribe/preferences');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ token: 'tok', topic_ids: [] });
  });
});
