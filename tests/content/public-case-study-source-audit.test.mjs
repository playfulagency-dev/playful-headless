import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

import { auditPublicCaseStudySource } from '../../lib/content/public-case-study-source-audit.mjs';

const require = createRequire(import.meta.url);
const publicCaseStudyOverrides = require('../../utils/public-case-study-overrides.json');

const expected = {
  title: 'Caso técnico',
  summary: 'Descripción técnica verificable.',
  acf: {
    h1: 'Caso técnico',
    resultadotitulo: 'Componentes técnicos documentados',
    testimonialnombre: '',
    testimonialcargo: '',
    testimonio: '',
  },
};

test('the source allowlist covers exactly the two public case studies under remediation', () => {
  assert.deepEqual(Object.keys(publicCaseStudyOverrides).sort(), [
    'jumex-shopify-dtc-ecommerce',
    'odwalla-shopify-dtc-ecommerce',
  ]);
});

test('accepts an exact technical source record and approved media fields', () => {
  const record = {
    slug: 'caso-tecnico',
    title: { rendered: expected.title },
    content: { rendered: `<p>${expected.summary}</p>` },
    acf: { ...expected.acf, imagenbanner: 'https://example.com/imagen-35%-ancho.jpg' },
  };

  assert.deepEqual(auditPublicCaseStudySource(record, 'caso-tecnico', expected), []);
});

test('reports changed and unexpected fields without echoing their values', () => {
  const record = {
    slug: 'caso-tecnico',
    title: { rendered: 'Otro título' },
    content: { rendered: '<p>Resultados medibles desde el primer mes.</p>' },
    acf: {
      ...expected.acf,
      resultadotitulo: 'Aumento en la tasa de conversión',
      testimonialnombre: 'Federico Vera',
      beneficio: 'Duplicamos los ingresos',
    },
  };

  const mismatches = auditPublicCaseStudySource(record, 'caso-tecnico', expected);
  assert.ok(mismatches.includes('title.rendered'));
  assert.ok(mismatches.includes('content.rendered'));
  assert.ok(mismatches.includes('acf.resultadotitulo'));
  assert.ok(mismatches.includes('acf.testimonialnombre'));
  assert.ok(mismatches.includes('acf.unexpected:beneficio'));
  assert.ok(mismatches.every((path) => !path.includes('Federico')));
  assert.ok(mismatches.every((path) => !path.includes('Duplicamos')));
});

test('ignores object key order while comparing nested ACF values', () => {
  const nestedExpected = {
    ...expected,
    acf: {
      ...expected.acf,
      mostrar_cta_final: { mostrar_cta: true, titulo: 'CTA técnica' },
    },
  };
  const record = {
    slug: 'caso-tecnico',
    title: { rendered: nestedExpected.title },
    content: { rendered: `<p>${nestedExpected.summary}</p>` },
    acf: {
      ...nestedExpected.acf,
      mostrar_cta_final: { titulo: 'CTA técnica', mostrar_cta: true },
    },
  };

  assert.deepEqual(auditPublicCaseStudySource(record, 'caso-tecnico', nestedExpected), []);
});
