import { NotideusError } from './errors.js';

const DEFAULT_BASE_URL = 'https://api.notideus.io';
const DEFAULT_TIMEOUT_MS = 30_000;
const VERSION = '0.1.0';

export interface ClientOptions {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  authenticated?: boolean;
  signal?: AbortSignal;
}

export class ApiClient {
  private readonly apiKey?: string;
  private readonly baseURL: string;
  private readonly timeout: number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseURL = options.baseURL ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    return this.attempt<T>(method, path, options);
  }

  private async attempt<T>(method: string, path: string, options: RequestOptions): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const headers: Record<string, string> = {
      'User-Agent': `notideus-node/${VERSION}`
    };
    if (options.authenticated !== false && this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }
    let body: string | undefined;
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    const onCallerAbort = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener('abort', onCallerAbort, { once: true });
    }

    try {
      const response = await fetch(url, { method, headers, body, signal: controller.signal });
      if (response.status === 204) return undefined as T;
      if (!response.ok) throw await this.toError(response);
      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof NotideusError) throw err;
      if (options.signal?.aborted) throw err;
      throw new NotideusError({
        code: controller.signal.aborted ? 'request_timeout' : 'network_error',
        message: err instanceof Error ? err.message : String(err),
        status: 0
      });
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const url = new URL(path, this.baseURL);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  private async toError(response: Response): Promise<NotideusError> {
    let code = 'unknown_error';
    let message = response.statusText || `HTTP ${response.status}`;
    try {
      const parsed = (await response.json()) as { error?: { code?: string; message?: string } };
      if (parsed.error?.code) code = parsed.error.code;
      if (parsed.error?.message) message = parsed.error.message;
    } catch {
      // non-JSON error body — keep the defaults
    }
    const retryAfterHeader = response.headers.get('retry-after');
    return new NotideusError({
      code,
      message,
      status: response.status,
      retryAfter: retryAfterHeader ? Number(retryAfterHeader) : undefined
    });
  }
}
