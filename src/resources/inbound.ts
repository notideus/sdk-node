import type { ApiClient, BinaryResult } from '../client.js';
import type {
  CreateInboundRouteParams,
  InboundMessage,
  InboundRoute,
  InboxFolder,
  InboxFolderOverview,
  UpdateInboundMessageParams,
  ListInboundMessagesParams,
  ListInboundMessagesResponse,
  ListInboundRoutesResponse,
  UpdateInboundRouteParams
} from '../types/inbound.js';

function routePath(id: string): string {
  return `/v1/inbound/routes/${encodeURIComponent(id)}`;
}

function messagePath(id: string): string {
  return `/v1/inbound/messages/${encodeURIComponent(id)}`;
}

export class InboundRoutesResource {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<ListInboundRoutesResponse> {
    return this.client.request<ListInboundRoutesResponse>('GET', '/v1/inbound/routes');
  }

  async create(params: CreateInboundRouteParams): Promise<InboundRoute> {
    const res = await this.client.request<{ route: InboundRoute }>('POST', '/v1/inbound/routes', { body: params });
    return res.route;
  }

  async get(id: string): Promise<InboundRoute> {
    const res = await this.client.request<{ route: InboundRoute }>('GET', routePath(id));
    return res.route;
  }

  async update(id: string, params: UpdateInboundRouteParams): Promise<InboundRoute> {
    const res = await this.client.request<{ route: InboundRoute }>('PATCH', routePath(id), { body: params });
    return res.route;
  }

  async delete(id: string): Promise<void> {
    await this.client.request<void>('DELETE', routePath(id));
  }
}

export class InboundMessagesResource {
  constructor(private readonly client: ApiClient) {}

  async list(params: ListInboundMessagesParams = {}): Promise<ListInboundMessagesResponse> {
    const { q, route_id, folder, folder_id, unread, attachments, sort, cursor, limit } = params;
    return this.client.request<ListInboundMessagesResponse>('GET', '/v1/inbound/messages', {
      query: {
        q,
        route_id,
        folder,
        folder_id,
        unread: unread === undefined ? undefined : String(unread),
        attachments: attachments === undefined ? undefined : String(attachments),
        sort,
        cursor,
        limit
      }
    });
  }

  async get(id: string): Promise<InboundMessage> {
    const res = await this.client.request<{ message: InboundMessage }>('GET', messagePath(id));
    return res.message;
  }

  async raw(id: string, options: { signal?: AbortSignal } = {}): Promise<BinaryResult> {
    return this.client.requestBinary(`${messagePath(id)}/raw`, options);
  }

  async attachment(messageId: string, index: number, options: { signal?: AbortSignal } = {}): Promise<BinaryResult> {
    return this.client.requestBinary(`${messagePath(messageId)}/attachments/${index}`, options);
  }

  async update(id: string, params: UpdateInboundMessageParams): Promise<InboundMessage> {
    const res = await this.client.request<{ message: InboundMessage }>('PATCH', messagePath(id), { body: params });
    return res.message;
  }

  async delete(id: string): Promise<void> {
    await this.client.request<void>('DELETE', messagePath(id));
  }
}

function folderPath(id: string): string {
  return `/v1/inbound/folders/${encodeURIComponent(id)}`;
}

export class InboundFoldersResource {
  constructor(private readonly client: ApiClient) {}

  async list(): Promise<InboxFolderOverview> {
    return this.client.request<InboxFolderOverview>('GET', '/v1/inbound/folders');
  }

  async create(name: string): Promise<InboxFolder> {
    const res = await this.client.request<{ folder: InboxFolder }>('POST', '/v1/inbound/folders', { body: { name } });
    return res.folder;
  }

  async update(id: string, name: string): Promise<InboxFolder> {
    const res = await this.client.request<{ folder: InboxFolder }>('PATCH', folderPath(id), { body: { name } });
    return res.folder;
  }

  async delete(id: string): Promise<void> {
    await this.client.request<void>('DELETE', folderPath(id));
  }
}

export class InboundResource {
  readonly routes: InboundRoutesResource;
  readonly messages: InboundMessagesResource;
  readonly folders: InboundFoldersResource;

  constructor(client: ApiClient) {
    this.routes = new InboundRoutesResource(client);
    this.messages = new InboundMessagesResource(client);
    this.folders = new InboundFoldersResource(client);
  }
}
