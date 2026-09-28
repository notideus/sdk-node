import type { ApiClient } from '../client.js';
import type { BatchItemResult } from '../types/common.js';
import type {
  BulkContactInput,
  Contact,
  CreateContactParams,
  ListContactsParams,
  ListContactsResponse,
  UpdateContactParams
} from '../types/contact.js';

function contactPath(email: string): string {
  return `/v1/contacts/${encodeURIComponent(email)}`;
}

export class ContactsResource {
  constructor(private readonly client: ApiClient) {}

  async list(params: ListContactsParams = {}): Promise<ListContactsResponse> {
    const { limit, status, email, cursor } = params;
    return this.client.request<ListContactsResponse>('GET', '/v1/contacts', {
      query: { limit, status, email, cursor }
    });
  }

  async create(params: CreateContactParams): Promise<Contact> {
    return this.client.request<Contact>('POST', '/v1/contacts', { body: params });
  }

  async get(email: string): Promise<Contact> {
    return this.client.request<Contact>('GET', contactPath(email));
  }

  async update(email: string, params: UpdateContactParams): Promise<Contact> {
    return this.client.request<Contact>('PATCH', contactPath(email), { body: params });
  }

  async delete(email: string): Promise<void> {
    await this.client.request<void>('DELETE', contactPath(email));
  }

  async bulk(contacts: BulkContactInput[]): Promise<BatchItemResult[]> {
    const res = await this.client.request<{ data: BatchItemResult[] }>('POST', '/v1/contacts/bulk', {
      body: { contacts }
    });
    return res.data;
  }

  async unsubscribe(email: string): Promise<Contact> {
    return this.client.request<Contact>('POST', `${contactPath(email)}/unsubscribe`);
  }

  async resubscribe(email: string): Promise<Contact> {
    return this.client.request<Contact>('POST', `${contactPath(email)}/resubscribe`);
  }
}
