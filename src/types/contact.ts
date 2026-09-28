export type ContactStatus = 'subscribed' | 'unsubscribed' | 'bounced' | 'complained';

export interface Contact {
  id: string;
  email: string;
  status: ContactStatus;
  properties: Record<string, string>;
  subscribed_topic_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ListContactsParams {
  cursor?: string;
  limit?: number;
  email?: string;
  status?: ContactStatus;
}

export interface ListContactsResponse {
  data: Contact[];
  next_cursor?: string;
}

export interface CreateContactParams {
  email: string;
  properties?: Record<string, string>;
  topic_ids?: string[];
}

export interface UpdateContactParams {
  properties?: Record<string, string>;
  topic_ids?: string[];
}

export interface BulkContactInput {
  email: string;
  properties?: Record<string, string>;
}
