interface SendEventBase {
  event: string;
  payload?: Record<string, unknown>;
  idempotency_key?: string;
}

export type SendEventParams = SendEventBase & (
  | { email: string; contact_id?: never }
  | { contact_id: string; email?: never }
);

export interface AutomationEvent {
  id: string;
  event: string;
  email: string;
  contact_id: string | null;
  payload: Record<string, unknown>;
  source: 'api' | 'test';
  created_at: string;
}

export interface SendEventResult {
  event: AutomationEvent;
  created: boolean;
}
