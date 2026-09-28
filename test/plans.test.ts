import { afterEach, describe, expect, it, vi } from 'vitest';
import { Notideus } from '../src/index.js';
import { jsonResponse, mockFetch } from './helpers/mock-fetch.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

const catalogFixture = {
  free_allowances: { emails: 5000, contacts: 1000 },
  overage_per_1000_cents: 75,
  plans: [
    {
      key: 'pro',
      kind: 'paid',
      name: 'Pro',
      blurb: 'For growing teams',
      cta: 'Start free trial',
      featured: true,
      benefits: ['10 emails/s'],
      send_rate_per_second: 10,
      tiers: [{ emails: 50000, monthly_cents: 1500, annual_cents: 1200 }]
    },
    {
      key: 'free',
      kind: 'free',
      name: 'Free',
      blurb: 'Get started',
      cta: null,
      featured: false,
      benefits: [],
      email_limit: 5000,
      contact_limit: 1000,
      domains_limit: 5,
      send_rate_per_second: 1,
      tiers: null
    },
    {
      key: 'enterprise',
      kind: 'custom',
      name: 'Enterprise',
      blurb: 'Contact sales',
      cta: 'Contact sales',
      featured: false,
      benefits: [],
      send_rate_per_second: 10,
      tiers: null
    }
  ],
  contacts_tiers: [{ contacts: 5000, monthly_cents: 3500 }]
};

describe('plans', () => {
  it('fetches the catalog without an API key and without an Authorization header', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, catalogFixture));
    const notideus = new Notideus();
    const catalog = await notideus.plans.list();
    expect(catalog.free_allowances).toEqual({ emails: 5000, contacts: 1000 });
    expect(catalog.plans.map((p) => p.key)).toEqual(['pro', 'free', 'enterprise']);
    expect(catalog.plans[0].tiers).toEqual([{ emails: 50000, monthly_cents: 1500, annual_cents: 1200 }]);
    expect(catalog.plans[1].tiers).toBeNull();
    expect(catalog.contacts_tiers).toHaveLength(1);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(calls[0].url).toBe('https://api.notideus.io/v1/plans');
  });

  it('passes the locale query param', async () => {
    const { calls } = mockFetch(() => jsonResponse(200, catalogFixture));
    const notideus = new Notideus();
    await notideus.plans.list({ locale: 'fr' });
    expect(calls[0].url).toBe('https://api.notideus.io/v1/plans?locale=fr');
  });
});
