import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContactDeliveryError,
  checkWordPressReceipt,
  DeterministicContactDeliveryError,
  UncertainContactDeliveryError,
  WordPressIdempotencyProtocolError,
  deliverToWordPress,
} from '../../lib/contact/delivery.ts';
import { lead } from './fixtures.ts';

function configuredEnvironment() {
  const previous = {
    url: process.env.WORDPRESS_API_URL,
    token: process.env.WORDPRESS_CONTACT_TOKEN,
  };
  process.env.WORDPRESS_API_URL = 'https://wordpress.invalid/wp-json';
  process.env.WORDPRESS_CONTACT_TOKEN = 'test-token';
  return () => {
    if (previous.url === undefined) delete process.env.WORDPRESS_API_URL;
    else process.env.WORDPRESS_API_URL = previous.url;
    if (previous.token === undefined) delete process.env.WORDPRESS_CONTACT_TOKEN;
    else process.env.WORDPRESS_CONTACT_TOKEN = previous.token;
  };
}

function receiptResponse(state: 'completed' | 'processing' | 'missing'): Response {
  const status = state === 'completed' ? 200 : state === 'processing' ? 202 : 404;
  return new Response(JSON.stringify({ state }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Playful-Contact-Idempotency': 'v1',
    },
  });
}

function contactResponse(status = 200): Response {
  return new Response(JSON.stringify({ success: status >= 200 && status < 300 }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Playful-Contact-Idempotency': 'v1',
    },
  });
}

test('sends a stable submission receipt key to WordPress', async () => {
  const restore = configuredEnvironment();
  try {
    let request: RequestInit | undefined;
    await deliverToWordPress(lead, {
      fetchImpl: async (_input, init) => {
        request = init;
        return contactResponse();
      },
    });

    const headers = new Headers(request?.headers);
    assert.equal(headers.get('X-Playful-Submission-Id'), lead.submissionId);
    const body = JSON.parse(String(request?.body));
    assert.equal(body.submission_id, lead.submissionId);
    assert.deepEqual(body.qualification, lead.qualification);
  } finally {
    restore();
  }
});

test('recovers a lost success response by retrying the same idempotent submission', async () => {
  const restore = configuredEnvironment();
  try {
    const paths: string[] = [];
    const delays: number[] = [];
    let calls = 0;

    await deliverToWordPress(lead, {
      idempotentRetriesEnabled: true,
      fetchImpl: async (input) => {
        calls += 1;
        paths.push(String(input));
        if (calls === 1) return receiptResponse('missing');
        if (calls === 2) {
          const error = new Error('response lost after WordPress completed the request');
          error.name = 'TimeoutError';
          throw error;
        }
        return receiptResponse('completed');
      },
      sleep: async (delay) => { delays.push(delay); },
    });

    assert.equal(calls, 3);
    assert.match(paths[0], /contact-receipt$/);
    assert.match(paths[1], /contact$/);
    assert.match(paths[2], /contact-receipt$/);
    assert.deepEqual(delays, [500]);
  } finally {
    restore();
  }
});

test('waits for an in-progress duplicate and then accepts its completed receipt', async () => {
  const restore = configuredEnvironment();
  try {
    let calls = 0;
    await deliverToWordPress(lead, {
      idempotentRetriesEnabled: true,
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return receiptResponse('missing');
        return calls === 2 ? contactResponse(409) : receiptResponse('completed');
      },
      sleep: async () => {},
    });
    assert.equal(calls, 3);
  } finally {
    restore();
  }
});

test('rechecks the v1 receipt before every retry and never performs a blind second write', async () => {
  const restore = configuredEnvironment();
  try {
    const paths: string[] = [];
    await assert.rejects(() => deliverToWordPress(lead, {
      idempotentRetriesEnabled: true,
      fetchImpl: async (input) => {
        paths.push(String(input));
        if (paths.length === 1) return receiptResponse('missing');
        if (paths.length === 2) throw new Error('lost contact response');
        return new Response(JSON.stringify({ state: 'missing' }), { status: 404 });
      },
      sleep: async () => {},
    }), WordPressIdempotencyProtocolError);

    assert.equal(paths.length, 3);
    assert.match(paths[0], /contact-receipt$/);
    assert.match(paths[1], /contact$/);
    assert.match(paths[2], /contact-receipt$/);
  } finally {
    restore();
  }
});

test('does not retry an ambiguous write until WordPress idempotency is explicitly enabled', async () => {
  const restore = configuredEnvironment();
  try {
    let calls = 0;
    await assert.rejects(
      deliverToWordPress(lead, {
        idempotentRetriesEnabled: false,
        fetchImpl: async () => {
          calls += 1;
          const error = new Error('timeout');
          error.name = 'TimeoutError';
          throw error;
        },
      }),
      (error) => error instanceof ContactDeliveryError && error.status === 504,
    );
    assert.equal(calls, 1);
  } finally {
    restore();
  }
});

test('classifies an explicit 4xx rejection as deterministic and safe to retry later', async () => {
  const restore = configuredEnvironment();
  try {
    await assert.rejects(
      deliverToWordPress(lead, {
        fetchImpl: async () => new Response(null, { status: 422 }),
      }),
      (error) => error instanceof DeterministicContactDeliveryError
        && error.upstreamStatus === 422,
    );
  } finally {
    restore();
  }
});

test('classifies a 5xx after a write as uncertain even with receipt retries enabled', async () => {
  const restore = configuredEnvironment();
  try {
    let calls = 0;
    await assert.rejects(
      deliverToWordPress(lead, {
        idempotentRetriesEnabled: true,
        fetchImpl: async () => {
          calls += 1;
          return calls === 1 ? receiptResponse('missing') : contactResponse(500);
        },
        sleep: async () => {},
      }),
      UncertainContactDeliveryError,
    );
    assert.equal(calls, 2);
  } finally {
    restore();
  }
});

test('checks completed, processing and missing receipts without sending contact PII', async () => {
  const restore = configuredEnvironment();
  try {
    for (const state of ['completed', 'processing', 'missing'] as const) {
      let body = '';
      const result = await checkWordPressReceipt(lead, {
        fetchImpl: async (_input, init) => {
          body = String(init?.body || '');
          return receiptResponse(state);
        },
      });
      assert.equal(result, state);
      assert.equal(body.includes(lead.email), false);
      assert.equal(body.includes(lead.name), false);
      assert.equal(body.includes(lead.phone), false);
      assert.match(body, /submission_id/);
    }
  } finally {
    restore();
  }
});

test('fails before the contact write when the receipt capability header is absent', async () => {
  const restore = configuredEnvironment();
  try {
    const paths: string[] = [];
    await assert.rejects(() => deliverToWordPress(lead, {
      idempotentRetriesEnabled: true,
      fetchImpl: async (input) => {
        paths.push(String(input));
        return new Response(JSON.stringify({ state: 'missing' }), { status: 404 });
      },
    }), WordPressIdempotencyProtocolError);
    assert.equal(paths.length, 1);
    assert.match(paths[0], /contact-receipt$/);
  } finally {
    restore();
  }
});

test('rejects a successful contact response without the v1 protocol header', async () => {
  const restore = configuredEnvironment();
  try {
    let calls = 0;
    await assert.rejects(() => deliverToWordPress(lead, {
      idempotentRetriesEnabled: true,
      fetchImpl: async () => {
        calls += 1;
        return calls === 1
          ? receiptResponse('missing')
          : new Response(JSON.stringify({ success: true }), { status: 200 });
      },
    }), WordPressIdempotencyProtocolError);
    assert.equal(calls, 2);
  } finally {
    restore();
  }
});

test('also rejects headerless 2xx on the single-attempt Redis-free rollback path', async () => {
  const restore = configuredEnvironment();
  try {
    let calls = 0;
    await assert.rejects(() => deliverToWordPress(lead, {
      idempotentRetriesEnabled: false,
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      },
    }), WordPressIdempotencyProtocolError);
    assert.equal(calls, 1);
  } finally {
    restore();
  }
});
