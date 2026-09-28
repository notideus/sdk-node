import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('whatsapp.messages', () => {
  it('sends a template message and returns one entry per recipient', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(201, {
        data: [
          { id: '9c2e', to: '+33612345678', status: 'queued' },
          { id: '9c2f', to: '+1555123456', status: 'queued' }
        ]
      })
    );
    const notideus = new Notideus('k');
    const messages = await notideus.whatsapp.messages.send({
      template_id: '8f1c',
      to: ['+33612345678', '+1555123456'],
      parameters: { 'body:1': 'Jane' },
      idempotency_key: 'req-123'
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ id: '9c2e', to: '+33612345678', status: 'queued' });
    expect(calls[0].url).toBe('https://api.notideus.io/v1/whatsapp/messages');
    expect(calls[0].init.method).toBe('POST');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body).toEqual({
      template_id: '8f1c',
      to: ['+33612345678', '+1555123456'],
      parameters: { 'body:1': 'Jane' },
      idempotency_key: 'req-123'
    });
  });

  it('maps the 200 idempotent replay to the original messages', async () => {
    mockFetch(() => jsonResponse(200, { data: [{ id: '9c2e', to: '+33612345678', status: 'queued' }] }));
    const notideus = new Notideus('k');
    const messages = await notideus.whatsapp.messages.send({
      template_id: '8f1c',
      to: ['+33612345678'],
      idempotency_key: 'req-123'
    });
    expect(messages[0].id).toBe('9c2e');
  });

  it('sends a batch and returns per-item results without throwing', async () => {
    const { calls } = mockFetch(() =>
      jsonResponse(200, {
        data: [
          { index: 0, id: '9c2e' },
          { index: 1, error: { code: 'invalid_phone', message: 'to[0]: invalid_phone: +abc is not a valid E.164 phone number' } }
        ]
      })
    );
    const notideus = new Notideus('k');
    const results = await notideus.whatsapp.messages.sendBatch([
      { template_id: '8f1c', to: ['+33612345678'], parameters: { 'body:1': 'Jane' } },
      { template_id: '8f1c', to: ['+abc'], parameters: {} }
    ]);
    expect(results[0]).toEqual({ index: 0, id: '9c2e' });
    expect(results[1]).toMatchObject({ index: 1, error: { code: 'invalid_phone' } });
    expect(calls[0].url).toBe('https://api.notideus.io/v1/whatsapp/messages/batch');
    const body = JSON.parse(calls[0].init.body as string);
    expect(body.messages).toHaveLength(2);
  });
});
