import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const contactFixture = {
  id: '3fa8',
  email: 'jane@example.com',
  status: 'subscribed',
  properties: { plan: 'pro' },
  subscribed_topic_ids: ['7b1c'],
  created_at: '2026-09-10T12:00:00Z',
  updated_at: '2026-09-10T12:00:00Z'
};

describe('contacts', () => {
  it('lists contacts with filters and maps the page envelope', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, { data: [contactFixture], next_cursor: '20' })
    );
    const notideus = new Notideus('k');
    const page = await notideus.contacts.list({ limit: 20, status: 'subscribed', email: 'jane', cursor: '0' });
    expect(page.data).toHaveLength(1);
    expect(page.data[0].email).toBe('jane@example.com');
    expect(page.next_cursor).toBe('20');
    expect(calls[0].url).toBe(
      'https://api.notideus.io/v1/contacts?limit=20&status=subscribed&email=jane&cursor=0'
    );
  });

  it('creates a contact', async () => {
    const { calls } = mockFetch(() => jsonResponse(201, contactFixture));
    const notideus = new Notideus('k');
    const contact = await notideus.contacts.create({
      email: 'jane@example.com',
      properties: { plan: 'pro' },
      topic_ids: ['7b1c']
    });
    expect(contact.status).toBe('subscribed');
    expect(calls[0].init.method).toBe('POST');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual({ email: 'jane@example.com', properties: { plan: 'pro' }, topic_ids: ['7b1c'] });
  });

  it('gets a contact by email, URL-encoding the path segment', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, contactFixture));
    const notideus = new Notideus('k');
    await notideus.contacts.get('jane+news@example.com');
    expect(calls[0].init.method).toBe('GET');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/contacts/jane%2Bnews%40example.com');
  });

  it('updates a contact', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, contactFixture));
    const notideus = new Notideus('k');
    await notideus.contacts.update('jane@example.com', { properties: { plan: 'scale' } });
    expect(calls[0].init.method).toBe('PATCH');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/contacts/jane%40example.com');
    expect(JSON.parse(calls[0].init.body as string)).toEqual({ properties: { plan: 'scale' } });
  });

  it('deletes a contact and resolves undefined on 204', async () => {
    const { calls } = mockFetch(() => new Response(null, { status: 204 }));
    const notideus = new Notideus('k');
    await expect(notideus.contacts.delete('jane@example.com')).resolves.toBeUndefined();
    expect(calls[0].init.method).toBe('DELETE');
  });

  it('bulk upserts contacts and returns per-item results', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, { data: [{ index: 0, id: '3fa8' }, { index: 1, error: { code: 'bad_request', message: 'invalid email' } }] })
    );
    const notideus = new Notideus('k');
    const results = await notideus.contacts.bulk([{ email: 'jane@example.com' }, { email: 'not-an-email' }]);
    expect(results[0]).toEqual({ index: 0, id: '3fa8' });
    expect(results[1]).toMatchObject({ index: 1, error: { code: 'bad_request' } });
    expect(calls[0].url).toBe('https://api.notideus.io/v1/contacts/bulk');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.contacts).toHaveLength(2);
  });

  it('unsubscribes a contact and returns it', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, { ...contactFixture, status: 'unsubscribed' }));
    const notideus = new Notideus('k');
    const contact = await notideus.contacts.unsubscribe('jane@example.com');
    expect(contact.status).toBe('unsubscribed');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/contacts/jane%40example.com/unsubscribe');
  });

  it('resubscribes a contact and returns it', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, contactFixture));
    const notideus = new Notideus('k');
    await notideus.contacts.resubscribe('jane@example.com');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/contacts/jane%40example.com/resubscribe');
  });
});
