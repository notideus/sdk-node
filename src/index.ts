import { ApiClient, type ClientOptions } from './client.js';
import { ContactsResource } from './resources/contacts.js';
import { EmailsResource } from './resources/emails.js';
import { PlansResource } from './resources/plans.js';
import { UnsubscribeResource } from './resources/unsubscribe.js';
import { WhatsAppResource } from './resources/whatsapp.js';

export { NotideusError } from './errors.js';
export type { ClientOptions } from './client.js';
export type { BatchItemError, BatchItemResult } from './types/common.js';
export type {
  BulkContactInput,
  Contact,
  ContactStatus,
  CreateContactParams,
  ListContactsParams,
  ListContactsResponse,
  UpdateContactParams
} from './types/contact.js';
export type { Email, SendEmailParams } from './types/email.js';
export type {
  ContactsTier,
  FreeAllowances,
  Plan,
  PlanCatalog,
  PlanLocale,
  PlanTier
} from './types/plans.js';
export type { SendWhatsAppMessageParams, WhatsAppMessage } from './types/whatsapp.js';
export type { UnsubscribeInfo, UnsubscribeTopic } from './types/unsubscribe.js';

export class Notideus {
  private readonly client: ApiClient;
  readonly emails: EmailsResource;
  readonly contacts: ContactsResource;
  readonly whatsapp: WhatsAppResource;
  readonly unsubscribe: UnsubscribeResource;
  readonly plans: PlansResource;

  constructor(apiKey?: string, options: Omit<ClientOptions, 'apiKey'> = {}) {
    this.client = new ApiClient({ ...options, apiKey });
    this.emails = new EmailsResource(this.client);
    this.contacts = new ContactsResource(this.client);
    this.whatsapp = new WhatsAppResource(this.client);
    this.unsubscribe = new UnsubscribeResource(this.client);
    this.plans = new PlansResource(this.client);
  }
}
