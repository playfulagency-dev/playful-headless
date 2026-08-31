import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getWpDynamicRoutePolicy,
  getWpDynamicRouteRobots,
  parseLegacyIndexableSlugs,
  WP_AUXILIARY_SLUGS,
  WP_GOVERNED_SLUGS,
  WP_LEGACY_INDEXABLE_SLUGS_ENV,
  WP_LEGACY_SLUGS,
  WP_SERVICE_SLUGS,
} from '../utils/wp-dynamic-route-governance.mjs';
import {
  WordPressUnavailableError,
  wordpressFetchCollection,
} from '../services/wordpress-request.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const expectedServices = [
  'agencia-seo',
  'agencia-sem',
  'agencia-diseno-web',
  'agencia-e-commerce',
  'marketing-internacional',
  'agencia-ux-ui',
  'seo-expertos',
  'seo-vigo',
];

const expectedLegacy = [
  'miembros-de-equipo',
  'seo-internacional',
  'servicio-marketing-digital',
  'pasarela-de-pago-ecommerce',
  'pagos-online-ecommerce',
  'marketing-digital-espana',
  'landing-seo',
  'landing-page',
  'privacy-policy',
  'mercantil-servicios-financieros-internacional',
  'policlinica-metropolitana',
  'grupo-automotriz-multimarca',
  'email-marketing',
  'home',
  'home-2',
];

test('keeps an exact, unique inventory of 8 services, gracias and 15 legacy pages', () => {
  assert.deepEqual(WP_SERVICE_SLUGS, expectedServices);
  assert.deepEqual(WP_AUXILIARY_SLUGS, ['gracias']);
  assert.deepEqual(WP_LEGACY_SLUGS, expectedLegacy);
  assert.equal(WP_GOVERNED_SLUGS.length, 24);
  assert.equal(new Set(WP_GOVERNED_SLUGS).size, 24);
});

test('services remain indexable while gracias and all legacy pages default to noindex,follow', () => {
  for (const slug of WP_SERVICE_SLUGS) {
    const policy = getWpDynamicRoutePolicy(slug, { legacyIndexableSlugs: '' });
    assert.deepEqual(policy, { kind: 'service', indexable: true });
    assert.equal(getWpDynamicRouteRobots(policy), undefined);
  }

  const auxiliary = getWpDynamicRoutePolicy('gracias', { legacyIndexableSlugs: '' });
  assert.deepEqual(auxiliary, { kind: 'auxiliary', indexable: false });
  assert.deepEqual(getWpDynamicRouteRobots(auxiliary), { index: false, follow: true });

  for (const slug of WP_LEGACY_SLUGS) {
    const policy = getWpDynamicRoutePolicy(slug, { legacyIndexableSlugs: '' });
    assert.deepEqual(policy, { kind: 'legacy', indexable: false });
    assert.deepEqual(getWpDynamicRouteRobots(policy), { index: false, follow: true });
  }
});

test('the server-only feature flag opts in only exact reviewed legacy slugs', () => {
  assert.equal(WP_LEGACY_INDEXABLE_SLUGS_ENV, 'WP_LEGACY_INDEXABLE_SLUGS');
  assert.deepEqual(
    [...parseLegacyIndexableSlugs(' home,privacy-policy,unknown,agencia-seo,home ')],
    ['home', 'privacy-policy'],
  );
  assert.deepEqual(
    getWpDynamicRoutePolicy('home', { legacyIndexableSlugs: 'home' }),
    { kind: 'legacy', indexable: true },
  );
  assert.equal(
    getWpDynamicRoutePolicy('future-wordpress-page', {
      legacyIndexableSlugs: 'future-wordpress-page',
    }),
    null,
  );
});

test('the dynamic route rejects unknown slugs before WordPress and governs metadata robots', async () => {
  const source = await readFile(path.join(repositoryRoot, 'app/[slug]/page.tsx'), 'utf8');
  assert.match(source, /export const dynamicParams = true/);
  assert.match(source, /return WP_SERVICE_SLUGS\.map\(\(slug\) => \(\{ slug \}\)\)/);
  assert.match(
    source,
    /const policy = getWpDynamicRoutePolicy\(slug\);\s+if \(!policy\) notFound\(\);\s+const url[\s\S]*?getPageMetadataBySlug\(slug\)/,
  );
  assert.match(
    source,
    /const \{ slug \} = await params;\s+if \(!getWpDynamicRoutePolicy\(slug\)\) notFound\(\);\s+const page = await getPageBySlug\(slug\)/,
  );
  assert.match(source, /\.\.\.\(robots \? \{ robots \} : \{\}\)/);
  assert.doesNotMatch(source, /redirect\(/);
});

test('an empty WordPress collection is absence, while a persistent 5xx is unavailable', async () => {
  const empty = await wordpressFetchCollection('https://endpoint.playfulagency.com/wp-json/wp/v2/pages', {}, {
    fetchImpl: async () => new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });
  assert.deepEqual(empty.items, []);

  let attempts = 0;
  await assert.rejects(
    wordpressFetchCollection('https://endpoint.playfulagency.com/wp-json/wp/v2/pages', {}, {
      fetchImpl: async () => {
        attempts += 1;
        return new Response(null, { status: 500, statusText: 'Internal Server Error' });
      },
      sleep: async () => {},
    }),
    (error) => error instanceof WordPressUnavailableError
      && error.status === 500
      && error.attempts === 3,
  );
  assert.equal(attempts, 3);
});

test('a WordPress collection 404 is upstream failure, not page absence', async () => {
  await assert.rejects(
    wordpressFetchCollection('https://endpoint.playfulagency.com/wp-json/wp/v2/pages', {}, {
      fetchImpl: async () => new Response(null, { status: 404, statusText: 'Not Found' }),
    }),
    (error) => error instanceof WordPressUnavailableError && error.status === 404,
  );
});

test('the WordPress deadline aborts a stalled request without returning an empty collection', async () => {
  let signal;
  await assert.rejects(
    wordpressFetchCollection('https://endpoint.playfulagency.com/wp-json/wp/v2/pages', {}, {
      fetchImpl: async (_input, init) => {
        signal = init.signal;
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
        });
      },
      timeoutMs: 5,
    }),
    (error) => error instanceof WordPressUnavailableError && /deadline/.test(error.message),
  );
  assert.equal(signal.aborted, true);
});

test('getPageBySlug propagates upstream failures and returns null only for an empty 200', async () => {
  const source = await readFile(path.join(repositoryRoot, 'services/wordpress.ts'), 'utf8');
  const functionSource = source.slice(
    source.indexOf('export async function getPageBySlug'),
    source.indexOf('// Interfaz para los ítems del menú'),
  );
  assert.match(functionSource, /wordpressFetchCollection<any>/);
  assert.match(functionSource, /if \(!pages\?\.\[0\]\) return null/);
  assert.doesNotMatch(functionSource, /catch\s*\(/);
  assert.doesNotMatch(functionSource, /Error en getPageBySlug/);
});
