import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeWebsiteLead,
  SubmissionValidationError,
} from '../../lib/contact/normalize.ts';

test('normalizes identity and bounds attribution to a relative landing', () => {
  const result = normalizeWebsiteLead({
    submissionId: '00000000-0000-4000-8000-000000000000',
    name: '  Ada Lovelace  ',
    email: ' ADA@EXAMPLE.COM ',
    phone: '+34 (911) 111-111',
    business: ' Analytical Engines ',
    message: ' Necesitamos una tienda. ',
    decisionRole: 'owner',
    salesModel: 'd2c',
    monthlyRevenue: 'over_100k',
    projectTiming: '0_30_days',
    privacyConsent: true,
    marketingConsent: false,
    originalAttribution: {
      source: 'Google Ads',
      landing: 'https://evil.example/contacto?utm_source=google',
      formId: 'attacker-controlled',
    },
    recentAttribution: { source: '', landing: '/contacto' },
  }, new Date('2026-08-30T12:00:00.000Z'));

  assert.equal(result.email, 'ada@example.com');
  assert.equal(result.phone, '+34911111111');
  assert.equal(result.originalAttribution.source, 'google-ads');
  assert.equal(result.originalAttribution.landing, '/contacto?utm_source=google');
  assert.equal(result.originalAttribution.formId, 'website-contact');
  assert.equal(result.consentCapturedAt, '2026-08-30T12:00:00.000Z');
  assert.equal(result.qualification.salesModel, 'd2c');
});

test('requires a clarification only when Otro is selected', () => {
  const base = {
    submissionId: '00000000-0000-4000-8000-000000000000',
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hola',
    privacyConsent: true,
    decisionRole: 'other',
    salesModel: 'marketplace_to_d2c',
    monthlyRevenue: 'over_100k',
    projectTiming: '0_30_days',
  };

  assert.throws(() => normalizeWebsiteLead(base), SubmissionValidationError);
  const result = normalizeWebsiteLead({ ...base, decisionRoleOther: 'Socia operativa' });
  assert.equal(result.qualification.decisionRoleOther, 'Socia operativa');
});

test('rejects a submission without explicit privacy consent', () => {
  assert.throws(() => normalizeWebsiteLead({
    submissionId: '00000000-0000-4000-8000-000000000000',
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hola',
    privacyConsent: false,
  }), SubmissionValidationError);
});
