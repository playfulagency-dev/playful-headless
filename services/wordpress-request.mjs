const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 150;
const DEFAULT_MAX_DELAY_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 8_000;

const TRANSIENT_STATUSES = new Set([408, 425, 429]);

export class WordPressUnavailableError extends Error {
  constructor(message, { url, status, attempts, cause } = {}) {
    super(message, { cause });
    this.name = 'WordPressUnavailableError';
    this.url = url;
    this.status = status;
    this.attempts = attempts;
  }
}

export { WordPressUnavailableError as WordPressUpstreamError };

export function isTransientWordPressStatus(status) {
  return TRANSIENT_STATUSES.has(status) || (status >= 500 && status <= 599);
}

function abortReason(signal) {
  return signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
}

function throwIfAborted(signal) {
  if (signal.aborted) throw abortReason(signal);
}

function defaultSleep(delayMs, signal) {
  return new Promise((resolve, reject) => {
    throwIfAborted(signal);
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function requestUrl(input) {
  return typeof input === 'string' || input instanceof URL ? String(input) : input.url;
}

async function cancelResponseBody(response) {
  await response?.body?.cancel().catch(() => {});
}

function bufferedResponse(response, body) {
  return new Response(body.byteLength > 0 ? body : null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function wordpressRequest(input, init, options, consumeResponse) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = requestUrl(input);
  const requestSignal = init.signal ?? (
    typeof Request !== 'undefined' && input instanceof Request ? input.signal : undefined
  );

  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new TypeError('maxAttempts must be an integer greater than zero');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('timeoutMs must be greater than zero');
  }
  if (requestSignal?.aborted) throw abortReason(requestSignal);

  const operationController = new AbortController();
  const onRequestAbort = () => operationController.abort(abortReason(requestSignal));
  requestSignal?.addEventListener('abort', onRequestAbort, { once: true });
  const deadlineTimer = setTimeout(() => {
    operationController.abort(new DOMException(
      `WordPress request exceeded its ${timeoutMs}ms deadline`,
      'TimeoutError',
    ));
  }, timeoutMs);
  const operationSignal = operationController.signal;

  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      let response;
      try {
        throwIfAborted(operationSignal);
        response = await fetchImpl(input, { ...init, signal: operationSignal });

        if (response.ok || response.status === 404) {
          return await consumeResponse(response, { attempt, url });
        }

        const retryable = isTransientWordPressStatus(response.status);
        if (!retryable || attempt === maxAttempts) {
          throw new WordPressUnavailableError(
            `WordPress request failed with ${response.status} ${response.statusText}`,
            { url, status: response.status, attempts: attempt },
          );
        }

        await cancelResponseBody(response);
      } catch (error) {
        await cancelResponseBody(response);
        if (error instanceof WordPressUnavailableError) throw error;
        if (operationSignal.aborted) {
          if (requestSignal?.aborted) throw abortReason(requestSignal);
          throw new WordPressUnavailableError(
            `WordPress request exceeded its ${timeoutMs}ms deadline`,
            { url, attempts: attempt, cause: abortReason(operationSignal) },
          );
        }
        if (error?.name === 'AbortError') throw error;

        if (attempt === maxAttempts) {
          throw new WordPressUnavailableError(
            `WordPress request failed after ${attempt} attempts`,
            { url, attempts: attempt, cause: error },
          );
        }
      }

      const exponentialDelay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitter = Math.floor(random() * baseDelayMs);
      try {
        await sleep(Math.min(exponentialDelay + jitter, maxDelayMs), operationSignal);
      } catch (error) {
        if (requestSignal?.aborted) throw abortReason(requestSignal);
        if (operationSignal.aborted) {
          throw new WordPressUnavailableError(
            `WordPress request exceeded its ${timeoutMs}ms deadline`,
            { url, attempts: attempt, cause: abortReason(operationSignal) },
          );
        }
        throw error;
      }
      if (operationSignal.aborted) {
        if (requestSignal?.aborted) throw abortReason(requestSignal);
        throw new WordPressUnavailableError(
          `WordPress request exceeded its ${timeoutMs}ms deadline`,
          { url, attempts: attempt, cause: abortReason(operationSignal) },
        );
      }
    }

    throw new WordPressUnavailableError('WordPress request exhausted its retry budget', {
      url,
      attempts: maxAttempts,
    });
  } finally {
    clearTimeout(deadlineTimer);
    requestSignal?.removeEventListener('abort', onRequestAbort);
  }
}

export async function wordpressFetch(input, init = {}, options = {}) {
  return wordpressRequest(input, init, options, async (response) => {
    const body = await response.arrayBuffer();
    return bufferedResponse(response, body);
  });
}

/** Fetch a WordPress REST collection while preserving absence vs outage. */
export async function wordpressFetchCollection(input, init = {}, options = {}) {
  return wordpressRequest(input, init, options, async (response, { attempt, url }) => {
    if (response.status !== 200) {
      throw new WordPressUnavailableError(
        `WordPress collection failed with ${response.status} ${response.statusText}`,
        { url, status: response.status, attempts: attempt },
      );
    }

    const items = await response.json();
    if (!Array.isArray(items)) {
      throw new WordPressUnavailableError('WordPress collection returned a non-array payload', {
        url,
        status: response.status,
        attempts: attempt,
      });
    }
    return { items, response };
  });
}
