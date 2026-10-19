export interface NotideusErrorOptions {
  code: string;
  message: string;
  status: number;
  retryAfter?: number;
  /** Admin-provided note, present on account_suspended errors. */
  reason?: string;
}

export class NotideusError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfter?: number;
  readonly reason?: string;

  constructor(options: NotideusErrorOptions) {
    super(options.message);
    this.name = 'NotideusError';
    this.code = options.code;
    this.status = options.status;
    this.retryAfter = options.retryAfter;
    this.reason = options.reason;
  }
}
