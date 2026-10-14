export type WebhookEndpointStatus = 'active' | 'disabled';

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  secret_prefix: string;
  events: string[];
  status: WebhookEndpointStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateWebhookParams {
  name: string;
  url: string;
  events: string[];
}

export interface UpdateWebhookParams {
  name: string;
  url: string;
  events: string[];
  status: WebhookEndpointStatus;
}

export interface WebhookCreated {
  endpoint: WebhookEndpoint;
  secret: string;
}

export interface ListWebhooksParams {
  cursor?: string;
  limit?: number;
}

export interface ListWebhooksResponse {
  data: WebhookEndpoint[];
  next_cursor?: string;
}

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_type: string;
  payload: unknown;
  status: WebhookDeliveryStatus;
  attempts: number;
  last_status_code: number | null;
  last_error: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface WebhookAttempt {
  attempt: number;
  status_code: number | null;
  error: string | null;
  duration_ms: number;
  created_at: string;
}

export interface WebhookDeliveryResult {
  delivery: WebhookDelivery;
  attempts: WebhookAttempt[];
}

export interface ListWebhookDeliveriesParams {
  endpoint_id?: string;
  event_type?: string;
  status?: WebhookDeliveryStatus;
  cursor?: string;
  limit?: number;
}

export interface ListWebhookDeliveriesResponse {
  data: WebhookDelivery[];
  next_cursor?: string;
}

export interface WebhookEventDescriptor {
  type: string;
  description: string;
  sample: unknown;
}
