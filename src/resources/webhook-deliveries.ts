import type { ApiClient } from '../client.js';
import type {
  ListWebhookDeliveriesParams,
  ListWebhookDeliveriesResponse,
  WebhookDelivery,
  WebhookDeliveryResult
} from '../types/webhook.js';

function deliveryPath(id: string): string {
  return `/v1/webhook-deliveries/${encodeURIComponent(id)}`;
}

export class WebhookDeliveriesResource {
  constructor(private readonly client: ApiClient) {}

  async list(params: ListWebhookDeliveriesParams = {}): Promise<ListWebhookDeliveriesResponse> {
    const { endpoint_id, event_type, status, cursor, limit } = params;
    return this.client.request<ListWebhookDeliveriesResponse>('GET', '/v1/webhook-deliveries', {
      query: { endpoint_id, event_type, status, cursor, limit }
    });
  }

  async get(id: string): Promise<WebhookDeliveryResult> {
    return this.client.request<WebhookDeliveryResult>('GET', deliveryPath(id));
  }

  async redeliver(id: string): Promise<WebhookDelivery> {
    const res = await this.client.request<{ delivery: WebhookDelivery }>('POST', `${deliveryPath(id)}/redeliver`);
    return res.delivery;
  }
}
