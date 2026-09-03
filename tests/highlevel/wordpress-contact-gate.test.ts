import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const gate = readFileSync(new URL('../../wordpress-contact-gate.php', import.meta.url), 'utf8');
const endpoint = readFileSync(new URL('../../wordpress-contact-endpoint.php', import.meta.url), 'utf8');

function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert(from >= 0, `missing contract start: ${start}`);
  assert(to > from, `missing contract end: ${end}`);
  return source.slice(from, to);
}

test('auth remains the final pre-dispatch gate before any receipt is claimed', () => {
  const preDispatch = between(gate, "add_filter('rest_pre_dispatch'", "add_filter('rest_post_dispatch'");
  assert(preDispatch.includes('PHP_INT_MAX, 3)'));
  assert(preDispatch.indexOf("get_option(PLAYFUL_CONTACT_GATE_ENFORCE_OPTION") >= 0);
  assert(preDispatch.indexOf("get_header('x-playful-contact-token')") >= 0);
  assert(
    preDispatch.indexOf('playful_contact_gate_claim_submission')
      > preDispatch.indexOf("get_header('x-playful-contact-token')"),
  );
  assert(preDispatch.includes('playful_contact_gate_is_receipt_request'));
});

test('exposes a protected side-effect-free receipt lookup with explicit states', () => {
  const lookup = between(
    gate,
    'function playful_contact_gate_read_receipt',
    "add_action('rest_api_init'",
  );
  const registration = between(
    gate,
    "add_action('rest_api_init'",
    'register_activation_hook',
  );

  assert(registration.includes("'/contact-receipt'"));
  assert(registration.includes("'methods' => 'POST'"));
  assert(lookup.includes("array('state' => 'missing')"));
  assert(lookup.includes("array('state' => 'completed')"));
  assert(lookup.includes("array('state' => 'processing')"));
  assert(lookup.includes('PLAYFUL_CONTACT_GATE_ENFORCE_OPTION'));
  assert(!lookup.includes('wp_mail('));
  assert(!lookup.includes('playful_handle_contact_form'));
});

test('legacy requests bypass receipts while supplied identifiers fail closed', () => {
  const submissionId = between(
    gate,
    'function playful_contact_gate_submission_id',
    'function playful_contact_gate_request_context',
  );
  assert(submissionId.includes("if ($body_id === '' && $header_id === '')"));
  assert(submissionId.includes("return '';"));
  assert(submissionId.includes("preg_match('/\\A[A-Za-z0-9_-]{20,100}\\z/'"));
  assert(submissionId.includes('playful_contact_gate_submission_id_mismatch'));
  assert(submissionId.includes("array('status' => 400)"));
});

test('validates versioned qualification selections before it claims a receipt', () => {
  const validation = between(
    gate,
    'function playful_contact_gate_allowed_qualification_values',
    'function playful_contact_gate_request_context',
  );
  const preDispatch = between(gate, "add_filter('rest_pre_dispatch'", "add_filter('rest_post_dispatch'");
  assert(validation.includes("'decisionRole'"));
  assert(validation.includes("'salesModel'"));
  assert(validation.includes("'monthlyRevenue'"));
  assert(validation.includes("'projectTiming'"));
  assert(validation.includes("array('status' => 422)"));
  assert(preDispatch.indexOf('playful_contact_gate_validate_qualification')
    < preDispatch.indexOf('playful_contact_gate_claim_submission'));
});

test('claims atomically using a hash-only, non-autoloaded option', () => {
  const receiptKey = between(
    gate,
    'function playful_contact_gate_receipt_key',
    'function playful_contact_gate_receipt_value',
  );
  const receiptValue = between(
    gate,
    'function playful_contact_gate_receipt_value',
    'function playful_contact_gate_submission_id',
  );
  const claim = between(
    gate,
    'function playful_contact_gate_claim_submission',
    'function playful_contact_gate_mark_completed',
  );

  assert(receiptKey.includes("hash('sha256', $submission_id)"));
  assert.deepEqual(
    Array.from(receiptValue.matchAll(/'([a-z_]+)'\s*=>/g), (match) => match[1]),
    ['state', 'created_at', 'updated_at'],
  );
  assert(claim.includes("add_option($key, $processing, '', false)"));
  assert(!claim.includes('update_option('));
  assert(!gate.includes('error_log('));
});

test('replays completed receipts and rejects concurrent work with retry metadata', () => {
  const preDispatch = between(gate, "add_filter('rest_pre_dispatch'", "add_filter('rest_post_dispatch'");
  assert(preDispatch.includes("$claim['kind'] === 'completed'"));
  assert(preDispatch.includes("'replayed' => true"));
  assert(preDispatch.includes('playful_contact_gate_protocol_response(200'));
  assert(preDispatch.includes("$claim['kind'] === 'busy'"));
  assert(preDispatch.includes('playful_contact_gate_protocol_response(409'));
  assert(preDispatch.includes("$response->header('Retry-After', '1')"));
  assert(gate.includes("$response->header('X-Playful-Contact-Idempotency', 'v1')"));
});

test('completes only after a callback 2xx and releases only deterministic 4xx', () => {
  const postDispatch = between(gate, "add_filter('rest_post_dispatch'", "add_action('admin_init'");
  const deterministic = between(
    gate,
    'function playful_contact_gate_is_deterministic_rejection',
    'function playful_contact_gate_protocol_response',
  );

  assert(postDispatch.includes('$status >= 200 && $status < 300'));
  assert(postDispatch.includes('playful_contact_gate_mark_completed($context)'));
  assert(postDispatch.includes('playful_contact_gate_is_deterministic_rejection($status)'));
  assert(postDispatch.includes('playful_contact_gate_release_claim($context)'));
  assert(deterministic.includes('$status >= 400'));
  assert(deterministic.includes('$status < 500'));
  for (const uncertain of ['408', '409', '425', '429']) {
    assert(deterministic.includes(uncertain));
  }
});

test('keeps receipts for seven days and cleans only the matching generation', () => {
  assert(gate.includes('const PLAYFUL_CONTACT_RECEIPT_TTL_SECONDS = 604800;'));
  const cleanup = between(
    gate,
    'function playful_contact_gate_cleanup_receipt',
    "add_action(\n    PLAYFUL_CONTACT_RECEIPT_CLEANUP_HOOK",
  );
  assert(cleanup.includes("($decoded['created_at'] ?? 0)"));
  assert(cleanup.includes('$created_at !== (int) $expected_created_at'));
  assert(cleanup.includes('delete_option($key)'));
  assert(gate.includes('playful_contact_gate_schedule_cleanup($key, $created_at)'));
});

test('the endpoint callback no longer owns receipt state or logs contact PII', () => {
  assert(!endpoint.includes('playful_contact_claim_submission'));
  assert(!endpoint.includes('playful_contact_receipt_'));
  assert(!endpoint.includes("error_log('Error al enviar email de contacto para: '"));
  assert(endpoint.includes("'submission_id' => array("));
});
