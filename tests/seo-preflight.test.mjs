import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ALIASES,
  BLOG_ALIASES,
  CANONICAL_ORIGIN,
  CANONICAL_PATHS,
  GENERAL_ALIASES,
  TEST_BLOG_PATH,
} from '../scripts/seo-preflight-config.mjs';
import {
  assertAliasInventory,
  expectRedirect,
  extractSeoMetadata,
  runEndpointProbe,
  runSeoSmoke,
  runWwwRedirectSmoke,
} from '../scripts/seo-smoke-lib.mjs';

const baseUrl = 'https://preview.example';

function pageMetadata(pathname) {
  const url = pathname === '/' ? CANONICAL_ORIGIN : `${CANONICAL_ORIGIN}${pathname}`;
  return [
    '<!doctype html><html><head>',
    `<meta content="${url}" property="og:url">`,
    `<link href="${url}" rel="alternate canonical">`,
    '</head><body>fixture</body></html>',
  ].join('');
}

function createFixtureFetch() {
  const aliasBySource = new Map(ALIASES.map((alias) => [alias.source, alias]));
  const destinations = new Set(ALIASES.map((alias) => alias.destination));
  return async (input) => {
    const url = new URL(input);
    const normalizedPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    const alias = aliasBySource.get(normalizedPath);

    if (alias) {
      return new Response(null, {
        status: alias.status,
        headers: { Location: `${alias.destination}${url.search}` },
      });
    }

    if (url.pathname === '/sitemap.xml') {
      const locations = CANONICAL_PATHS
        .map((pathname) => `<loc>${pathname === '/' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${pathname}`}</loc>`)
        .join('');
      return new Response(`<urlset>${locations}</urlset>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    if (url.pathname === TEST_BLOG_PATH) {
      return new Response('<html><head><meta name="robots" content="noindex, follow"></head></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    if (url.pathname.includes('/extra') || url.pathname.includes('/categoria-inexistente/')) {
      return new Response('not found', { status: 404 });
    }

    if (destinations.has(url.pathname) || CANONICAL_PATHS.includes(url.pathname)) {
      return new Response(pageMetadata(url.pathname), {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return new Response('not found', { status: 404 });
  };
}

test('keeps an exact 5 + 17 alias allowlist without loops', () => {
  assert.equal(GENERAL_ALIASES.length, 5);
  assert.equal(BLOG_ALIASES.length, 17);
  assert.equal(ALIASES.length, 22);
  assert.equal(new Set(ALIASES.map(({ source }) => source)).size, 22);
  assertAliasInventory();
});

test('rejects duplicate sources and redirect cycles', () => {
  assert.throws(
    () => assertAliasInventory([
      { source: '/a', destination: '/b', status: 301 },
      { source: '/a', destination: '/c', status: 301 },
    ]),
    /duplicate alias source/,
  );
  assert.throws(
    () => assertAliasInventory([
      { source: '/a', destination: '/b', status: 301 },
      { source: '/b', destination: '/a', status: 301 },
    ]),
    /redirect loop/,
  );
});

test('extracts canonical, og:url and robots regardless of attribute order', () => {
  const metadata = extractSeoMetadata([
    '<link href="https://playfulagency.com/blog" rel="alternate canonical">',
    '<meta content="https://playfulagency.com/blog" property="og:url">',
    '<meta content="noindex, follow" name="robots">',
  ].join(''));
  assert.deepEqual(metadata, {
    canonicals: ['https://playfulagency.com/blog'],
    openGraphUrls: ['https://playfulagency.com/blog'],
    robots: ['noindex, follow'],
  });
});

test('rejects a redirect that drops repeated or encoded attribution', async () => {
  const alias = GENERAL_ALIASES[0];
  const request = async () => new Response(null, {
    status: alias.status,
    headers: { Location: alias.destination },
  });
  await assert.rejects(
    expectRedirect({
      request,
      baseOrigin: 'https://preview.example',
      alias,
      pathname: `${alias.source}/?utm_content=one&utm_content=two&gclid=a%2Bb`,
    }),
    /preserve its query byte-for-byte/,
  );
});

test('runs the full redirect, canonical, sitemap and noindex preflight', async () => {
  const result = await runSeoSmoke({ baseUrl, fetchImpl: createFixtureFetch() });
  assert.deepEqual(result, { aliases: 22, canonicalPages: 12, destinations: 20 });
});

test('www smoke bounds canonical and trailing-slash hops with exact query', async () => {
  const requests = [];
  const fetchImpl = async (input) => {
    const url = new URL(input);
    requests.push(url.href);
    if (url.hostname === 'www.playfulagency.com') {
      return new Response(null, {
        status: 308,
        headers: { Location: `${CANONICAL_ORIGIN}${url.pathname}${url.search}` },
      });
    }
    if (url.pathname === '/blog/') {
      return new Response(null, {
        status: 308,
        headers: { Location: `/blog${url.search}` },
      });
    }
    return new Response('ok', { status: 200 });
  };

  const result = await runWwwRedirectSmoke({ fetchImpl });
  assert.equal(result.status, 308);
  assert.equal(result.canonicalHops, 1);
  assert.equal(result.trailingHops, 2);
  assert.equal(requests.length, 5);
});

test('endpoint probe performs one redacted, lightweight collection read', async () => {
  const requests = [];
  const fetchImpl = async (input, options) => {
    requests.push({ url: String(input), options });
    return new Response(JSON.stringify([{ id: 1, slug: 'fixture' }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await runEndpointProbe({
    endpointUrl: 'https://endpoint.playfulagency.com/wp-json/wp/v2/posts?_fields=id,slug&per_page=1',
    fetchImpl,
  });
  assert.equal(result.status, 200);
  assert.equal(result.items, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].options.redirect, 'manual');
  assert.equal(requests[0].options.headers.Accept, 'application/json');
});
