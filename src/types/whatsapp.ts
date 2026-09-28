export interface SendWhatsAppMessageParams {
  template_id: string;
  to: string[];
  parameters?: Record<string, string>;
  idempotency_key?: string;
}

export interface WhatsAppMessage {
  id: string;
  to: string;
  status: string;
}
