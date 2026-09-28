import { describe, expect, it } from 'vitest';
import { NotideusError } from '../src/errors.js';

describe('NotideusError', () => {
  it('carries code, status, message and retryAfter', () => {
    const err = new NotideusError({
      code: 'rate_limited',
      message: 'slow down',
      status: 429,
      retryAfter: 3
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NotideusError);
    expect(err.name).toBe('NotideusError');
    expect(err.code).toBe('rate_limited');
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBe(3);
    expect(err.message).toBe('slow down');
  });

  it('works without retryAfter', () => {
    const err = new NotideusError({ code: 'unauthorized', message: 'bad key', status: 401 });
    expect(err.retryAfter).toBeUndefined();
  });
});
