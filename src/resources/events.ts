import type { ApiClient } from '../client.js';
import type { SendEventParams, SendEventResult } from '../types/event.js';

export class EventsResource {
  constructor(private readonly client: ApiClient) {}

  async send(params: SendEventParams): Promise<SendEventResult> {
    return this.client.request<SendEventResult>('POST', '/v1/events/send', { body: params });
  }
}
