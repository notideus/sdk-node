# @notideus/sdk

Official Node.js SDK for the [Notideus](https://notideus.io) email API.

Zero runtime dependencies. Requires Node.js 18+ (global `fetch`). Ships ESM
and CommonJS builds with TypeScript declarations.

## Install

```bash
npm install @notideus/sdk
```

## Quickstart

```ts
import { Notideus } from '@notideus/sdk';

const notideus = new Notideus(process.env.NOTIDEUS_API_KEY);

const email = await notideus.emails.send({
  from: 'Acme Inc <noreply@acme.com>',
  to: ['jane@example.com'],
  subject: 'Welcome',
  html: '<p>Hi {{name}}</p>',
  variables: { name: 'Jane' },
  tags: ['welcome'],
  idempotency_key: 'req-123'
});
```

## Configuration

```ts
new Notideus(apiKey?, {
  baseURL?,   // default https://api.notideus.io — override for self-hosting
  timeout?,   // request timeout ms, default 30000
  maxRetries? // default 2 — see Retry below
});
```

The key is optional: `plans` and `unsubscribe` work without one. Calling an
authenticated resource without a key surfaces the API's 401 as a
`NotideusError`.

## Resources

Params and responses use snake_case exactly like the API. Payloads from the
[API reference](https://notideus.io/docs) work verbatim.

### Emails

```ts
await notideus.emails.send({ from, to, subject, html?, text?, template_id?, variables?, tags?, headers?, reply_to?, idempotency_key? });
await notideus.emails.sendBatch([{ /* same shape */ }, …]); // up to 100
```

### WhatsApp messages

```ts
await notideus.whatsapp.messages.send({ template_id, to: ['+33612345678'], parameters: { 'body:1': 'Jane' } });
await notideus.whatsapp.messages.sendBatch([…]);
```

`send` returns one entry per recipient: `[{ id, to, status }]`.

### Contacts

```ts
await notideus.contacts.create({ email, properties?, topic_ids? });
await notideus.contacts.get('jane@example.com');
await notideus.contacts.update('jane@example.com', { properties: { plan: 'pro' } });
await notideus.contacts.delete('jane@example.com');
await notideus.contacts.unsubscribe('jane@example.com');
await notideus.contacts.resubscribe('jane@example.com');
await notideus.contacts.bulk([{ email, properties? }, …]); // up to 1000

const page = await notideus.contacts.list({ limit: 100, status: 'subscribed' });
if (page.next_cursor) {
  const next = await notideus.contacts.list({ cursor: page.next_cursor });
}
```

### Hosted unsubscribe (token-based, unauthenticated)

```ts
const info = await notideus.unsubscribe.info(token);
await notideus.unsubscribe.unsubscribe(token);            // whole contact
await notideus.unsubscribe.unsubscribe(token, [topicId]); // specific topics
await notideus.unsubscribe.preferences(token, [topicId]); // desired subscribed set
```

### Plans (unauthenticated)

```ts
const catalog = await notideus.plans.list({ locale: 'fr' });
```

## Error handling

Request-level failures throw `NotideusError`:

```ts
import { NotideusError } from '@notideus/sdk';

try {
  await notideus.emails.send({…});
} catch (err) {
  if (err instanceof NotideusError && err.code === 'from_domain_not_verified') { … }
  if (err instanceof NotideusError && err.code === 'rate_limited') {
    // err.retryAfter = seconds to wait
  }
}
```

Batch sends never throw per item — inspect the results instead:

```ts
const results = await notideus.emails.sendBatch([…]);
for (const item of results) {
  if ('error' in item) console.error(item.index, item.error.code, item.error.message);
  else console.log(item.index, item.id);
}
```

A whole-batch failure (401, 402 `quota_exceeded`, 400 `batch_too_large`)
still throws.

## Retry behavior

The SDK retries network errors, 5xx and 429 (honoring `Retry-After`) with
exponential backoff — but only idempotent requests: reads/writes other than
POST, and sends that include an `idempotency_key` (matching the API's replay
semantics, so a retried send never double-sends). Set `maxRetries: 0` to
disable.

## Self-hosting / local development

```ts
const notideus = new Notideus(process.env.NOTIDEUS_API_KEY, {
  baseURL: 'http://localhost:8080'
});
```

## Development

```bash
npm install
npm run build      # dual ESM/CJS + d.ts to dist/
npm test           # vitest, mocked fetch — no infra needed
npm run typecheck
npm run lint
```

## Releasing

1. Update `version` in `package.json` and merge to `main`.
2. Create a GitHub Release with tag `v<version>` — it must match `package.json`, the workflow verifies this and fails otherwise.
3. The `publish` workflow runs the full gate (`npm ci`, typecheck, lint, test, build) and **stages** the package on npm via `npm stage publish`, deferring the 2FA proof-of-presence to a maintainer. The stage ID is written to the Actions run summary and to the step's `stage-id` output.
4. On your machine, review and finish the release:
   - `npm stage list` — see the staged version;
   - `npm stage approve <stage-id>` — npm prompts for 2FA and the package goes live;
   - `npm stage reject <stage-id>` — back it out instead.

Staged packages expire — approve promptly. Note that `npm stage` requires
the package to already exist on the registry: for the very first release
(`0.1.0`), publish once manually (`npm publish`, with your 2FA) before using
the staged flow.

**Tradeoff: no npm provenance attestations.** The package is no longer
published from GitHub's OIDC environment — the actual publish happens from
the maintainer's machine at approve time — so releases carry no npm
provenance attestations.

The workflow authenticates with the `NPM_TOKEN` repo secret — an npm
**automation** token able to *stage* `@notideus/sdk` (publishing itself is
deferred to the maintainer's 2FA approval). Set it under **Settings →
Secrets and variables → Actions**.
