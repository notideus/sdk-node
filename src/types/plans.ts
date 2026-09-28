export type PlanLocale = 'en' | 'fr';

export interface PlanTier {
  emails: number;
  monthly_cents: number;
  annual_cents?: number | null;
}

export interface ContactsTier {
  contacts: number;
  monthly_cents: number;
}

export interface Plan {
  key: string;
  kind: 'free' | 'paid' | 'custom';
  name: string;
  blurb: string;
  cta: string | null;
  featured: boolean;
  benefits: string[];
  email_limit?: number;
  contact_limit?: number;
  domains_limit?: number;
  storage_gb?: number;
  send_rate_per_second?: number | null;
  tiers?: PlanTier[] | null;
}

export interface FreeAllowances {
  emails: number;
  contacts: number;
}

export interface PlanCatalog {
  free_allowances: FreeAllowances;
  overage_per_1000_cents: number | null;
  plans: Plan[];
  contacts_tiers: ContactsTier[];
}
