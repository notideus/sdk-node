export type InboundRouteStatus = 'active' | 'disabled';

export interface InboundRoute {
  id: string;
  domain_id: string;
  recipient: string;
  name: string;
  webhook_endpoint_id: string | null;
  store: boolean;
  status: InboundRouteStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateInboundRouteParams {
  domain_id: string;
  recipient: string;
  name?: string;
  store: boolean;
  webhook_endpoint_id?: string;
}

export interface UpdateInboundRouteParams {
  recipient: string;
  name?: string;
  store: boolean;
  webhook_endpoint_id?: string;
}

export interface ListInboundRoutesResponse {
  data: InboundRoute[];
  meta: { simulate_enabled: boolean, retention_days: number };
}

export type InboundMessageStatus = 'received' | 'processed' | 'failed';

export interface InboundAttachment {
  name: string;
  content_type: string;
  size_kb: number;
  key: string;
}

export interface InboundMessage {
  id: string;
  route_id: string | null;
  from_addr: string;
  from_name: string;
  to_addr: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
  attachments: InboundAttachment[];
  spam_verdict: string | null;
  size_kb: number;
  status: InboundMessageStatus;
  error: string | null;
  received_at: string;
}

export interface ListInboundMessagesParams {
  q?: string;
  route_id?: string;
  cursor?: string;
  limit?: number;
}

export interface ListInboundMessagesResponse {
  data: InboundMessage[];
  next_cursor?: string;
}
