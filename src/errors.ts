export interface NotideusErrorOptions {
  code: string;
  message: string;
  status: number;
  retryAfter?: number;
}

export class NotideusError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfter?: number;

  constructor(options: NotideusErrorOptions) {
    super(options.message);
    this.name = 'NotideusError';
    this.code = options.code;
    this.status = options.status;
    this.retryAfter = options.retryAfter;
  }
}
