import type { ApiClient } from '../client.js';
import type { PlanCatalog, PlanLocale } from '../types/plans.js';

export class PlansResource {
  constructor(private readonly client: ApiClient) {}

  async list(params: { locale?: PlanLocale } = {}): Promise<PlanCatalog> {
    return this.client.request<PlanCatalog>('GET', '/v1/plans', {
      query: { locale: params.locale },
      authenticated: false
    });
  }
}
