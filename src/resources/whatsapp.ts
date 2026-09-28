import type { ApiClient } from '../client.js';
import type { BatchItemResult } from '../types/common.js';
import type { SendWhatsAppMessageParams, WhatsAppMessage } from '../types/whatsapp.js';

export class WhatsAppResource {
  readonly messages: WhatsAppMessagesResource;

  constructor(client: ApiClient) {
    this.messages = new WhatsAppMessagesResource(client);
  }
}

export class WhatsAppMessagesResource {
  constructor(private readonly client: ApiClient) {}

  async send(params: SendWhatsAppMessageParams): Promise<WhatsAppMessage[]> {
    const res = await this.client.request<{ data: WhatsAppMessage[] }>('POST', '/v1/whatsapp/messages', {
      body: params
    });
    return res.data;
  }

  async sendBatch(messages: SendWhatsAppMessageParams[]): Promise<BatchItemResult[]> {
    const res = await this.client.request<{ data: BatchItemResult[] }>('POST', '/v1/whatsapp/messages/batch', {
      body: { messages }
    });
    return res.data;
  }
}
