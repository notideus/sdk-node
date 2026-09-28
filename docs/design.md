# Design: Notideus Node.js SDK (`@notideus/sdk`)

Date: 2026-09-28
Status: approved (brainstorming session 2026-09-28)
Scope: new sibling project `sdk-node/` in the monorepo (its own git repo,
own toolchain, matching the four existing projects). No changes to the API
itself; the SDK mirrors the public surface documented in
`notideus-api/docs/public-api.md`.

## Background

Notideus exposes a public, API-key-only surface (`notideus-api/docs/public-api.md`):
email sends (single + batch), WhatsApp template messages (single + batch),
contacts (8 routes), hosted unsubscribe endpoints (token-based,
unauthenticated), and the unauthenticated plan catalog. Consumers today write
raw `fetch` calls against the snake_case JSON envelope. A first-party Node SDK
gives typed, discoverable access with correct error handling and retry
semantics built in.

## Goals

- Ship `@notideus/sdk`: a TypeScript, zero-runtime-dependency Node SDK
  covering the **full public surface**.
- Resource-namespace client (`notideus.emails.send(...)`) mirroring the URL
  structure, so the SDK reads as self-documenting against `public-api.md`.
- Faithful error model: the API's `{"error": {code, message}}` envelope maps
  to a typed `NotideusError`; batch per-item results are returned, not
  thrown — exactly the API's two error channels.
- Safe-by-default retry (network, 5xx, 429 honoring `Retry-After`) on
  idempotent requests only.
- Dual ESM + CJS build with type declarations, Node >= 18 (global fetch),
  publishable to npm.
- Full unit-test coverage with a mocked `fetch` — no infra needed.

## Non-goals

- No dashboard (session-JWT) endpoints — API-key surface only.
- No webhook signature verification helpers (SNS/Stripe webhooks are server
  concerns; the public API doc does not expose them).
- No client-side retry of non-idempotent sends without an `idempotency_key`.
- No generated code from OpenAPI — the API has no spec; types are hand-written
  1:1 from `public-api.md` and the Go response structs.
- No changes to the Go backend or the other four projects (docs cross-links
  are out of scope for v1).

## Decisions (from brainstorming)

| Decision | Choice |
|---|---|
| Endpoint scope | Full public surface (emails, WhatsApp, contacts, unsubscribe, plans) |
| Location | New sibling directory `sdk-node/` — fifth independent git repo |
| npm identity | `@notideus/sdk`, v0.1.0, MIT |
| API shape | Client class with resource namespaces (Stripe/Resend style) |
| Modules | Dual ESM + CJS, type declarations, `exports` map |
| HTTP | Global `fetch` (Node >= 18), zero runtime dependencies |
| Tests | Vitest + mocked global `fetch`, no infra |

## Project layout

```plain
sdk-node/
├── package.json          # exports: ESM (dist/index.js) + CJS (dist/index.cjs) + types; engines >= 18
├── tsconfig.json         # shared TS config (NodeNext, strict)
├── tsup.config.ts        # dual ESM/CJS build + d.ts
├── src/
│   ├── index.ts          # exports Notideus class + all public types
│   ├── client.ts         # core HTTP: fetch wrapper, auth, baseURL, retry
│   ├── errors.ts         # NotideusError + error-code union
│   ├── resources/
│   │   ├── emails.ts
│   │   ├── whatsapp.ts
│   │   ├── contacts.ts
│   │   ├── unsubscribe.ts
│   │   └── plans.ts
│   └── types/
│       ├── email.ts      # SendEmailParams, Email, BatchItemResult, …
│       ├── whatsapp.ts
│       ├── contact.ts
│       ├── unsubscribe.ts
│       └── plans.ts
├── test/                 # vitest specs, global fetch mocked
└── README.md             # per-resource quickstart
```

Build via `tsup` (dev dependency) — one config emits ESM + CJS + `.d.ts`.
Runtime dependency count: zero. Dev dependencies: `typescript`, `tsup`,
`vitest`, `@types/node`.

## Client and data flow

`new Notideus(apiKey?, options?)` where `options = { baseURL?, timeout?,
maxRetries? }`:

- `baseURL` defaults to `https://api.notideus.io`; overridable for
  self-hosting and local dev (`http://localhost:8080`).
- `apiKey` is **optional** so the unauthenticated groups (`plans`,
  `unsubscribe`) work without one (`new Notideus()`). Authenticated routes
  without a key fail with the API's own 401, surfaced as `NotideusError` —
  the client never pre-checks, keeping it thin and never out of sync.
- `timeout` defaults to 30 s; requests are abortable via an `AbortSignal`.
- `maxRetries` defaults to 2 (three attempts total); 0 disables retry.

Every resource method delegates to one internal
`client.request<T>(method, path, { query?, body?, signal? })`:

1. Builds URL from `baseURL` + path; serializes `query` (dropping
   `undefined`) and JSON-encodes `body`.
2. Attaches `Authorization: Bearer <key>` (when a key is set),
   `Content-Type: application/json`,
   `User-Agent: notideus-node/0.1.0`.
3. Non-2xx: parses the `{"error": {code, message}}` envelope and throws
   `NotideusError` (below). 2xx: returns parsed JSON as `T`.

## Error model

```ts
class NotideusError extends Error {
  code: 'unauthorized' | 'insufficient_scope' | 'domain_not_allowed' |
        'quota_exceeded' | 'rate_limited' | 'batch_too_large' |
        'contact_not_found' | 'contact_exists' | 'contact_suppressed' |
        'from_domain_not_verified' | 'invalid_from' | 'invalid_headers' |
        'invalid_reply_to' | 'invalid_phone' | 'invalid_params' |
        'bad_request' | (string & {}); // open union — forward-compatible
  status: number;        // HTTP status
  retryAfter?: number;   // seconds, present on 429 rate_limited
}
```

Two error channels, mirroring the API:

- **Request-level failures** throw `NotideusError`.
- **Batch item failures** (`emails.sendBatch`, `whatsapp.messages.sendBatch`,
  `contacts.bulk`) never throw per item. Each item resolves to
  `{ index: number; id: string } | { index: number; error: { code: string; message: string } }`
  — the API's exact per-item shape. Whole-batch failures (401,
  402 `quota_exceeded`, 400 `batch_too_large`) still throw.

## Retry semantics

- Retry on: network failure, 5xx, 429 — exponential backoff with jitter,
  honoring the `Retry-After` response header (seconds) on 429.
- Only idempotent requests are retried: all GET/PATCH/DELETE, plus POST sends
  **only when the caller supplied an `idempotency_key`** (matching the API's
  replay semantics — a retried send without a key could double-send).
  Contact create/bulk/unsubscribe POSTs are never auto-retried either, since
  the caller can supply no idempotency key for them.
- `Retry-After` is also surfaced on the thrown `NotideusError` so callers can
  back off manually when retries are exhausted.

## Resource surface

Params and responses use **snake_case mirroring the API JSON exactly**
(monorepo boundary convention) — payloads copy-paste straight from
`public-api.md`.

```ts
const notideus = new Notideus('nt_live_...', { baseURL?, timeout?, maxRetries? });

// POST /v1/emails, POST /v1/emails/batch
notideus.emails.send({ from, to, subject, html?, text?, template_id?,
                       variables?, tags?, headers?, reply_to?,
                       idempotency_key? }): Promise<Email>
notideus.emails.sendBatch(emails: SendEmailParams[]): Promise<BatchItemResult[]>

// POST /v1/whatsapp/messages(/batch); single send returns one entry per recipient
notideus.whatsapp.messages.send({ template_id, to: string[], parameters,
                                  idempotency_key? }): Promise<WhatsAppMessage[]>
notideus.whatsapp.messages.sendBatch(messages: SendWhatsAppMessageParams[]):
  Promise<BatchItemResult[]>

// contacts — all 8 routes
notideus.contacts.list({ cursor?, limit?, email?, status? }):
  Promise<{ data: Contact[]; next_cursor?: string }>
notideus.contacts.create({ email, properties?, topic_ids? }): Promise<Contact>
notideus.contacts.get(email: string): Promise<Contact>
notideus.contacts.update(email, { properties?, topic_ids? }): Promise<Contact>
notideus.contacts.delete(email: string): Promise<void>          // 204
notideus.contacts.bulk([{ email, properties? }]): Promise<BatchItemResult[]>
notideus.contacts.unsubscribe(email: string): Promise<Contact>
notideus.contacts.resubscribe(email: string): Promise<Contact>

// hosted unsubscribe — token-based, unauthenticated
notideus.unsubscribe.info(token): Promise<UnsubscribeInfo>
notideus.unsubscribe.unsubscribe(token, topic_ids?): Promise<void>  // 204
notideus.unsubscribe.preferences(token, topic_ids): Promise<void>   // 204

// GET /v1/plans — unauthenticated
notideus.plans.list({ locale?: 'en' | 'fr' }): Promise<PlanCatalog>
```

Batch methods take a bare array and wrap it into the API's envelope:
`emails.sendBatch([...])` → `{"emails": [...]}`, `whatsapp.messages.sendBatch`
→ `{"messages": [...]}`, `contacts.bulk` → `{"contacts": [...]}`.

Notable response shapes (verified against the Go handlers):

- `contacts.list` → `{"data": [...], "next_cursor"?: string}`
  (`internal/publicapi/contacts.go:88-90`); `next_cursor` is an opaque string
  passed back as `cursor`.
- WhatsApp single send → `{"data": [{"id", "to", "status"}]}` with **one
  entry per recipient** (`internal/publicapi/whatsapp.go:37`) — the SDK
  returns the array as-is rather than pretending a single message.
- Batch routes → `{"data": [{index, id | error}]}`.
- `contacts.delete` and the unsubscribe mutators return `void` on 204 with
  empty bodies.

## Types

`src/types/` mirrors the JSON 1:1: `Email` (incl. `body_text`, `headers`,
`reply_to`), `Contact` (`id`, `email`, `status`, `properties`,
`subscribed_topic_ids`, `created_at`, `updated_at`), `ContactStatus`
(`subscribed | unsubscribed | bounced | complained`), `WhatsAppMessage`
(`id`, `to`, `status`), `UnsubscribeInfo` (`email`, `status`, `team_name`,
`topics: [{id, name, display_name, subscribed}]`), `PlanCatalog` (per the
catalog shape in `public-api.md`), and the params types above. All public
types are re-exported from the package root.

## Testing

Vitest with the global `fetch` mocked (a small helper stubs `globalThis.fetch`
and records calls). Coverage targets:

- every resource method: correct method/path/query/body, response mapping;
- both error channels (thrown `NotideusError` with code/status/retryAfter vs
  per-item batch results);
- retry: backoff + jitter on 429 honoring `Retry-After`, 5xx, network error;
  **no retry** for keyless POST sends; `maxRetries: 0` disables;
- pagination params and `next_cursor` pass-through;
- unauthenticated groups work with no key; authenticated groups surface the
  API's 401.

`package.json` scripts: `build`, `test`, `typecheck` (`tsc --noEmit`),
`lint` (eslint, matching the sibling Nuxt projects' stylistic rules:
no comma dangle, 1tbs braces).

## Documentation

- `sdk-node/README.md`: install, quickstart, per-resource examples copied
  from `public-api.md` shapes, error handling, retry/pagination notes.
- Root `AGENTS.md`: add a `sdk-node/` section in the same commit as the
  implementation, per the Documentation & policy upkeep table.

## Release

- `npm run build` emits `dist/`; publishing is manual (`npm publish`) from a
  clean checkout — no CI workflow in this repo (matches the other projects).
- Version 0.1.0; `engines: { node: ">=18" }`.
