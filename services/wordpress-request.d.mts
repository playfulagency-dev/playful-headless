export interface WordPressFetchOptions {
  fetchImpl?: typeof fetch;
  sleep?: (delayMs: number, signal: AbortSignal) => Promise<void>;
  random?: () => number;
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export class WordPressUnavailableError extends Error {
  readonly url?: string;
  readonly status?: number;
  readonly attempts?: number;
}

export { WordPressUnavailableError as WordPressUpstreamError };

export function isTransientWordPressStatus(status: number): boolean;

export function wordpressFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } },
  options?: WordPressFetchOptions,
): Promise<Response>;

export function wordpressFetchCollection<T>(
  input: RequestInfo | URL,
  init?: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } },
  options?: WordPressFetchOptions,
): Promise<{ items: T[]; response: Response }>;
