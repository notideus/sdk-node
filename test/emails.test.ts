import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus, NotideusError } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('emails', () => {
  it('sends a single email', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(201, { id: '9c2e', from_address: 'noreply@acme.com', subject: 'Welcome' })
    );
    const notideus = new Notideus('nt_live_k');
    const email = await notideus.emails.send({
      from: 'Acme Inc <noreply@acme.com>',
      to: ['jane@example.com'],
      subject: 'Welcome',
      html: '<p>Hi {{name}}</p>',
      variables: { name: 'Jane' },
      tags: ['welcome'],
      idempotency_key: 'req-123'
    });
    expect(email.id).toBe('9c2e');
    expect(calls[0].url).toBe('https://api.notideus.io/v1/emails');
    expect(calls[0].init.method).toBe('POST');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual({
      from: 'Acme Inc <noreply@acme.com>',
      to: ['jane@example.com'],
      subject: 'Welcome',
      html: '<p>Hi {{name}}</p>',
      variables: { name: 'Jane' },
      tags: ['welcome'],
      idempotency_key: 'req-123'
    });
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer nt_live_k');
  });

  it('maps the 200 idempotent replay to the original email', async () => {
    mockFetch(() => jsonResponse(200, { id: 'same-id', idempotency_key: 'req-123' }));
    const notideus = new Notideus('nt_live_k');
    const email = await notideus.emails.send({
      from: 'a@b.co',
      to: ['j@x.co'],
      subject: 's',
      html: '<p>h</p>',
      idempotency_key: 'req-123'
    });
    expect(email.id).toBe('same-id');
  });

  it('sends a batch and returns per-item results without throwing', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, {
        data: [
          { index: 0, id: '9c2e' },
          { index: 1, error: { code: 'from_domain_not_verified', message: 'no verified domain matches the from address' } }
        ]
      })
    );
    const notideus = new Notideus('nt_live_k');
    const results = await notideus.emails.sendBatch([
      { from: 'a@b.co', to: ['j@x.co'], subject: 'one', html: '<p>1</p>' },
      { from: 'a@b.co', to: ['k@x.co'], subject: 'two', html: '<p>2</p>' }
    ]);
    expect(results).toEqual([
      { index: 0, id: '9c2e' },
      { index: 1, error: { code: 'from_domain_not_verified', message: 'no verified domain matches the from address' } }
    ]);
    expect(calls[0].url).toBe('https://api.notideus.io/v1/emails/batch');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.emails).toHaveLength(2);
  });

  it('throws NotideusError when the whole batch is rejected (402 quota_exceeded)', async () => {
    mockFetch(() => jsonResponse(402, { error: { code: 'quota_exceeded', message: 'allowance reached' } }));
    const notideus = new Notideus('nt_live_k');
    await expect(
      notideus.emails.sendBatch([{ from: 'a@b.co', to: ['j@x.co'], subject: 's', html: '<p>h</p>' }])
    ).rejects.toBeInstanceOf(NotideusError);
  });
});
