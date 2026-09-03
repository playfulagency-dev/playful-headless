import type { WebsiteLead } from './types.ts';
import { WORDPRESS_DELIVERY_TIMEOUT_MS } from './timeouts.ts';

const WORDPRESS_DELIVERY_MAX_ATTEMPTS = 4;
const WORDPRESS_DELIVERY_RETRY_DELAY_MS = 500;

export class ContactDeliveryError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ContactDeliveryError';
  }
}

export class DeterministicContactDeliveryError extends ContactDeliveryError {
  constructor(
    public readonly upstreamStatus: number,
    status = 502,
    message = 'El sistema de entrega rechazó el mensaje. Puedes intentarlo de nuevo.',
  ) {
    super(status, message);
    this.name = 'DeterministicContactDeliveryError';
  }
}

export class UncertainContactDeliveryError extends ContactDeliveryError {
  constructor(status = 504) {
    super(status, 'No pudimos confirmar la respuesta del sistema de entrega.');
    this.name = 'UncertainContactDeliveryError';
  }
}

export class WordPressIdempotencyProtocolError extends ContactDeliveryError {
  constructor(message = 'WordPress no confirmó el protocolo de entrega segura.') {
    super(502, message);
    this.name = 'WordPressIdempotencyProtocolError';
  }
}

export type WordPressReceiptState = 'completed' | 'processing' | 'missing';

interface WordPressDeliveryOptions {
  fetchImpl?: typeof fetch;
  sleep?: (delayMs: number) => Promise<void>;
  idempotentRetriesEnabled?: boolean;
}

interface WordPressReceiptOptions {
  fetchImpl?: typeof fetch;
}

function isRetryableStatus(status: number): boolean {
  // A returned 5xx may have happened after an unknown plugin side effect, so
  // only retry statuses that the receipt protocol explicitly makes safe.
  return status === 408 || status === 409 || status === 429;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function verifyRecaptcha(token: unknown): Promise<void> {
  if (typeof token !== 'string' || !token) {
    throw new ContactDeliveryError(400, 'Por favor, completa la verificación de seguridad.');
  }

  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    throw new ContactDeliveryError(503, 'La verificación de seguridad no está disponible temporalmente.');
  }

  let response: Response;
  try {
    response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new ContactDeliveryError(
      503,
      'La verificación de seguridad no respondió. No se ha enviado el mensaje; inténtalo de nuevo.',
    );
  }
  if (!response.ok) {
    throw new ContactDeliveryError(502, 'No pudimos completar la verificación de seguridad. No se ha enviado el mensaje.');
  }

  let result: { success?: boolean };
  try {
    result = await response.json() as { success?: boolean };
  } catch {
    throw new ContactDeliveryError(
      502,
      'La verificación de seguridad devolvió una respuesta inválida. No se ha enviado el mensaje.',
    );
  }
  if (result.success !== true) {
    throw new ContactDeliveryError(400, 'Verificación de seguridad fallida. Por favor, inténtalo de nuevo.');
  }
}

function wordpressConfiguration(): { wordpressUrl: string; token: string } {
  const wordpressUrl = process.env.WORDPRESS_API_URL?.replace(/\/$/, '');
  const token = process.env.WORDPRESS_CONTACT_TOKEN;
  if (!wordpressUrl || !token) {
    throw new DeterministicContactDeliveryError(
      0,
      503,
      'El formulario no está disponible temporalmente.',
    );
  }
  return { wordpressUrl, token };
}

function requireReceiptProtocol(response: Response): void {
  if (response.headers.get('X-Playful-Contact-Idempotency') !== 'v1') {
    throw new WordPressIdempotencyProtocolError();
  }
}

export async function checkWordPressReceipt(
  lead: Pick<WebsiteLead, 'submissionId'>,
  options: WordPressReceiptOptions = {},
): Promise<WordPressReceiptState> {
  const { wordpressUrl, token } = wordpressConfiguration();
  const fetchImpl = options.fetchImpl || fetch;
  let response: Response;
  try {
    response = await fetchImpl(`${wordpressUrl}/playful/v1/contact-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Playful-Contact-Token': token,
        'X-Playful-Submission-Id': lead.submissionId,
      },
      body: JSON.stringify({ submission_id: lead.submissionId }),
      signal: AbortSignal.timeout(WORDPRESS_DELIVERY_TIMEOUT_MS),
    });
  } catch {
    throw new UncertainContactDeliveryError();
  }

  requireReceiptProtocol(response);
  let payload: { state?: unknown };
  try {
    payload = await response.json() as { state?: unknown };
  } catch {
    throw new WordPressIdempotencyProtocolError('WordPress devolvió un recibo no interpretable.');
  }

  if (response.status === 200 && payload.state === 'completed') return 'completed';
  if (response.status === 202 && payload.state === 'processing') return 'processing';
  if (response.status === 404 && payload.state === 'missing') return 'missing';

  if (response.status >= 500) throw new UncertainContactDeliveryError(502);
  throw new WordPressIdempotencyProtocolError('WordPress devolvió un estado de recibo incompatible.');
}

export async function deliverToWordPress(
  lead: WebsiteLead,
  options: WordPressDeliveryOptions = {},
): Promise<void> {
  const { wordpressUrl, token } = wordpressConfiguration();

  const fetchImpl = options.fetchImpl || fetch;
  const wait = options.sleep || sleep;
  const idempotentRetriesEnabled = options.idempotentRetriesEnabled
    ?? process.env.WORDPRESS_CONTACT_IDEMPOTENCY_ENABLED === 'true';
  const attempts = idempotentRetriesEnabled ? WORDPRESS_DELIVERY_MAX_ATTEMPTS : 1;

  if (idempotentRetriesEnabled) {
    const receipt = await checkWordPressReceipt(lead, { fetchImpl });
    if (receipt === 'completed') return;
    if (receipt === 'processing') throw new UncertainContactDeliveryError(502);
  }

  const prepareRetry = async (attempt: number): Promise<boolean> => {
    await wait(WORDPRESS_DELIVERY_RETRY_DELAY_MS * attempt);
    const receipt = await checkWordPressReceipt(lead, { fetchImpl });
    if (receipt === 'completed') return true;
    if (receipt === 'processing') throw new UncertainContactDeliveryError(502);
    return false;
  };

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${wordpressUrl}/playful/v1/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Playful-Contact-Token': token,
          'X-Playful-Submission-Id': lead.submissionId,
        },
        body: JSON.stringify({
          submission_id: lead.submissionId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          business: lead.business,
          message: lead.message,
          qualification: lead.qualification,
        }),
        signal: AbortSignal.timeout(WORDPRESS_DELIVERY_TIMEOUT_MS),
      });

      // A 2xx without the Gate 1.1 protocol header cannot be accepted as a
      // confirmed delivery, even on the single-attempt rollback path.
      if (response.ok || idempotentRetriesEnabled) requireReceiptProtocol(response);
      if (response.ok) return;
      if (idempotentRetriesEnabled && isRetryableStatus(response.status) && attempt < attempts) {
        if (await prepareRetry(attempt)) return;
        continue;
      }

      if (response.status >= 400 && response.status < 500
        && response.status !== 408 && response.status !== 409) {
        throw new DeterministicContactDeliveryError(response.status);
      }
      throw new UncertainContactDeliveryError(502);
    } catch (error) {
      if (error instanceof ContactDeliveryError) throw error;
      if (idempotentRetriesEnabled && attempt < attempts) {
        if (await prepareRetry(attempt)) return;
        continue;
      }
      throw new UncertainContactDeliveryError();
    }
  }

  throw new UncertainContactDeliveryError();
}
