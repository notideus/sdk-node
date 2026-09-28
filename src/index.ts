import { ApiClient, type ClientOptions } from './client.js';
import { ContactsResource } from './resources/contacts.js';
import { EmailsResource } from './resources/emails.js';
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
export type { SendWhatsAppMessageParams, WhatsAppMessage } from './types/whatsapp.js';

export class Notideus {
  private readonly client: ApiClient;
  readonly emails: EmailsResource;
  readonly contacts: ContactsResource;
  readonly whatsapp: WhatsAppResource;

  constructor(apiKey?: string, options: Omit<ClientOptions, 'apiKey'> = {}) {
    this.client = new ApiClient({ ...options, apiKey });
    this.emails = new EmailsResource(this.client);
    this.contacts = new ContactsResource(this.client);
    this.whatsapp = new WhatsAppResource(this.client);
  }
}
