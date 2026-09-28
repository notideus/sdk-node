import type { ApiClient } from '../client.js';
import type { UnsubscribeInfo } from '../types/unsubscribe.js';

export class UnsubscribeResource {
  constructor(private readonly client: ApiClient) {}

  async info(token: string): Promise<UnsubscribeInfo> {
    return this.client.request<UnsubscribeInfo>('GET', '/v1/unsubscribe/info', {
      query: { t: token },
      authenticated: false
    });
  }

  async unsubscribe(token: string, topicIds?: string[]): Promise<void> {
    const body: Record<string, unknown> = { token };
    if (topicIds !== undefined) {
      body.topic_ids = topicIds;
    }
    await this.client.request<void>('POST', '/v1/unsubscribe', { body, authenticated: false });
  }

  async preferences(token: string, topicIds: string[]): Promise<void> {
    await this.client.request<void>('POST', '/v1/unsubscribe/preferences', {
      body: { token, topic_ids: topicIds },
      authenticated: false
    });
  }
}
