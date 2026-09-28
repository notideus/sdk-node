export interface SendEmailParams {
  from: string;
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  reply_to?: string;
  template_id?: string | null;
  variables?: Record<string, string>;
  tags?: string[];
  idempotency_key?: string;
}

export interface Email {
  id: string;
  team_id: string;
  domain_id: string;
  template_id: string | null;
  from_address: string;
  to_emails: string[];
  subject: string;
  html: string;
  size_kb: number;
  tags: string[] | null;
  status: string;
  idempotency_key: string | null;
  created_at: string;
  requeued_at: string | null;
  ses_message_id: string | null;
  broadcast_id: string | null;
  contact_id: string | null;
  unsubscribe_token: string | null;
  body_text: string;
  headers: Record<string, string> | null;
  reply_to: string;
}
