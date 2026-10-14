import type { ApiClient } from '../client.js';
import { WebhookDeliveriesResource } from './webhook-deliveries.js';
import type {
  CreateWebhookParams,
  ListWebhooksParams,
  ListWebhooksResponse,
  UpdateWebhookParams,
  WebhookCreated,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventDescriptor
} from '../types/webhook.js';

function webhookPath(id: string): string {
  return `/v1/webhooks/${encodeURIComponent(id)}`;
}

export class WebhooksResource {
  readonly deliveries: WebhookDeliveriesResource;

  constructor(private readonly client: ApiClient) {
    this.deliveries = new WebhookDeliveriesResource(client);
  }

  async list(params: ListWebhooksParams = {}): Promise<ListWebhooksResponse> {
    const { cursor, limit } = params;
    return this.client.request<ListWebhooksResponse>('GET', '/v1/webhooks', { query: { cursor, limit } });
  }

  async create(params: CreateWebhookParams): Promise<WebhookCreated> {
    return this.client.request<WebhookCreated>('POST', '/v1/webhooks', { body: params });
  }

  async get(id: string): Promise<WebhookEndpoint> {
    const res = await this.client.request<{ endpoint: WebhookEndpoint }>('GET', webhookPath(id));
    return res.endpoint;
  }

  async update(id: string, params: UpdateWebhookParams): Promise<WebhookEndpoint> {
    const res = await this.client.request<{ endpoint: WebhookEndpoint }>('PATCH', webhookPath(id), { body: params });
    return res.endpoint;
  }

  async delete(id: string): Promise<void> {
    await this.client.request<void>('DELETE', webhookPath(id));
  }

  async test(id: string, event?: string): Promise<WebhookDelivery> {
    const res = await this.client.request<{ delivery: WebhookDelivery }>(
      'POST',
      `${webhookPath(id)}/test`,
      { body: event ? { event } : {} }
    );
    return res.delivery;
  }

  // rotateSecret replaces the endpoint's signing secret; the new secret is
  // returned exactly once. The old secret stops working immediately.
  async rotateSecret(id: string): Promise<WebhookCreated> {
    return this.client.request<WebhookCreated>('POST', `${webhookPath(id)}/rotate-secret`, { body: {} });
  }

  async events(): Promise<WebhookEventDescriptor[]> {
    const res = await this.client.request<{ data: WebhookEventDescriptor[] }>('GET', '/v1/webhooks/meta/events');
    return res.data;
  }
}
