import type { ApiClient } from '../client.js';
import type { BatchItemResult } from '../types/common.js';
import type { Email, SendEmailParams } from '../types/email.js';

export class EmailsResource {
  constructor(private readonly client: ApiClient) {}

  async send(params: SendEmailParams): Promise<Email> {
    return this.client.request<Email>('POST', '/v1/emails', { body: params });
  }

  async sendBatch(emails: SendEmailParams[]): Promise<BatchItemResult[]> {
    const res = await this.client.request<{ data: BatchItemResult[] }>('POST', '/v1/emails/batch', {
      body: { emails }
    });
    return res.data;
  }
}
