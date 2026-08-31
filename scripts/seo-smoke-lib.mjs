import assert from 'node:assert/strict';

import {
  ALIASES,
  ATTRIBUTION_QUERY,
  CANONICAL_ORIGIN,
  CANONICAL_PATHS,
  ENDPOINT_PROBE_URL,
  TEST_BLOG_PATH,
} from './seo-preflight-config.mjs';

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function parseAttributes(tag) {
  const attributes = new Map();
  const pattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  for (const match of tag.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

export function extractSeoMetadata(html) {
  const canonicals = [];
  const openGraphUrls = [];
  const robots = [];

  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const rel = (attributes.get('rel') ?? '').toLowerCase().split(/\s+/);
    if (rel.includes('canonical') && attributes.has('href')) {
      canonicals.push(attributes.get('href'));
    }
  }

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    if ((attributes.get('property') ?? '').toLowerCase() === 'og:url' && attributes.has('content')) {
      openGraphUrls.push(attributes.get('content'));
    }
    if ((attributes.get('name') ?? '').toLowerCase() === 'robots' && attributes.has('content')) {
      robots.push(attributes.get('content'));
    }
  }

  return { canonicals, openGraphUrls, robots };
}

export function assertAliasInventory(aliases = ALIASES) {
  const sources = new Set();
  const redirectGraph = new Map();

  for (const alias of aliases) {
    assert.ok(alias.source.startsWith('/'), `alias source must be absolute: ${alias.source}`);
    assert.ok(alias.destination.startsWith('/'), `alias destination must be absolute: ${alias.destination}`);
    assert.ok(!sources.has(alias.source), `duplicate alias source: ${alias.source}`);
    assert.notEqual(alias.source, alias.destination, `self-redirect: ${alias.source}`);
    assert.ok(alias.status === 301 || alias.status === 308, `unexpected permanent status: ${alias.status}`);
    sources.add(alias.source);
    redirectGraph.set(alias.source, alias.destination);
  }

  for (const source of sources) {
    const visited = new Set();
    let current = source;
    while (redirectGraph.has(current)) {
      assert.ok(!visited.has(current), `redirect loop in inventory at ${current}`);
      visited.add(current);
      current = redirectGraph.get(current);
    }
  }
}

function expectedCanonical(pathname, canonicalOrigin) {
  return pathname === '/' ? canonicalOrigin : `${canonicalOrigin}${pathname}`;
}

function assertApexIdentity(value, expected, label) {
  assert.equal(value, expected, `${label} must match the apex canonical URL`);
  const hostname = new URL(value).hostname;
  assert.equal(hostname, 'playfulagency.com', `${label} must not leak www or endpoint hosts`);
}

export async function expectRedirect({ request, baseOrigin, alias, pathname }) {
  const response = await request(pathname);
  assert.equal(response.status, alias.status, `${pathname} should return ${alias.status}`);
  const location = response.headers.get('location');
  assert.ok(location, `${pathname} should include a Location header`);

  const requestUrl = new URL(pathname, baseOrigin);
  const target = new URL(location, baseOrigin);
  assert.equal(target.origin, baseOrigin, `${pathname} should stay on the tested origin`);
  assert.equal(target.pathname, alias.destination, `${pathname} should reach its canonical path`);
  assert.equal(target.search, requestUrl.search, `${pathname} must preserve its query byte-for-byte`);
  assert.notEqual(`${target.pathname}${target.search}`, `${requestUrl.pathname}${requestUrl.search}`);
}

async function assertDestinationHasNoLoop({ request, baseOrigin, pathname, maxHops = 5 }) {
  const visited = new Set();
  let current = new URL(pathname, baseOrigin);

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const key = current.href;
    assert.ok(!visited.has(key), `redirect loop detected at ${key}`);
    visited.add(key);

    const response = await request(`${current.pathname}${current.search}`);
    if (!REDIRECT_STATUSES.has(response.status)) {
      assert.equal(response.status, 200, `${pathname} should settle on 200, got ${response.status}`);
      return;
    }

    assert.ok(hop < maxHops, `${pathname} exceeded ${maxHops} redirect hops`);
    const location = response.headers.get('location');
    assert.ok(location, `${current.pathname} should include a Location header`);
    current = new URL(location, baseOrigin);
    assert.equal(current.origin, baseOrigin, `${pathname} redirect chain should stay on the tested origin`);
  }
}

async function assertCanonicalPage({ request, canonicalOrigin, pathname }) {
  const response = await request(`${pathname}?utm_source=seo-preflight`, { redirect: 'follow' });
  assert.equal(response.status, 200, `${pathname} should return 200`);
  const html = await response.text();
  const { canonicals, openGraphUrls } = extractSeoMetadata(html);
  const expected = expectedCanonical(pathname, canonicalOrigin);

  assert.equal(canonicals.length, 1, `${pathname} should emit exactly one canonical`);
  assert.equal(openGraphUrls.length, 1, `${pathname} should emit exactly one og:url`);
  assertApexIdentity(canonicals[0], expected, `${pathname} canonical`);
  assertApexIdentity(openGraphUrls[0], expected, `${pathname} og:url`);
}

async function assertTestBlogNoindex({ request }) {
  const response = await request(TEST_BLOG_PATH, { redirect: 'follow' });
  assert.equal(response.status, 200, `${TEST_BLOG_PATH} should remain available for controlled diagnostics`);
  const { robots } = extractSeoMetadata(await response.text());
  assert.equal(robots.length, 1, `${TEST_BLOG_PATH} should emit exactly one robots directive`);
  const tokens = new Set(robots[0].toLowerCase().split(',').map((token) => token.trim()));
  assert.ok(tokens.has('noindex'), `${TEST_BLOG_PATH} should be noindex`);
  assert.ok(tokens.has('follow'), `${TEST_BLOG_PATH} should remain follow`);
  assert.ok(!tokens.has('nofollow'), `${TEST_BLOG_PATH} should not be nofollow`);
}

export async function runSeoSmoke({
  baseUrl,
  canonicalOrigin = CANONICAL_ORIGIN,
  fetchImpl = fetch,
  aliases = ALIASES,
  canonicalPaths = CANONICAL_PATHS,
} = {}) {
  assert.ok(baseUrl, 'SEO_BASE_URL is required, for example https://branch.vercel.app');
  const baseOrigin = new URL(baseUrl).origin;
  const request = (pathname, options = {}) => fetchImpl(new URL(pathname, baseOrigin), {
    redirect: 'manual',
    ...options,
  });

  assertAliasInventory(aliases);

  for (const alias of aliases) {
    await expectRedirect({ request, baseOrigin, alias, pathname: alias.source });
    await expectRedirect({
      request,
      baseOrigin,
      alias,
      pathname: `${alias.source}/?${ATTRIBUTION_QUERY}`,
    });
  }

  for (const destination of new Set(aliases.map((alias) => alias.destination))) {
    await assertDestinationHasNoLoop({ request, baseOrigin, pathname: destination });
  }

  for (const pathname of canonicalPaths) {
    await assertCanonicalPage({ request, canonicalOrigin, pathname });
  }

  const invalidPath = '/blog/mas-vistos/bad-bunny-como-marca-la-potencia-del-marketing-musical/extra';
  const invalidResponse = await request(invalidPath);
  assert.equal(invalidResponse.status, 404, 'extra catch-all segments must not resolve');

  const unknownCategoryResponse = await request(
    '/blog/categoria-inexistente/bad-bunny-como-marca-la-potencia-del-marketing-musical?utm_source=seo-preflight',
  );
  assert.equal(unknownCategoryResponse.status, 404, 'unknown category aliases must not drop attribution');

  const sitemapResponse = await request('/sitemap.xml', { redirect: 'follow' });
  assert.equal(sitemapResponse.status, 200, 'sitemap should return 200');
  const sitemap = await sitemapResponse.text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.equal(new Set(urls).size, urls.length, 'sitemap must not contain duplicate URLs');
  assert.ok(urls.every((url) => url.startsWith(`${canonicalOrigin}/`)), 'sitemap must use the apex origin');
  assert.ok(
    urls.every((url) => !url.includes('endpoint.playfulagency.com') && !url.includes('www.playfulagency.com')),
    'sitemap must not leak www or endpoint hosts',
  );

  await assertTestBlogNoindex({ request });

  return {
    aliases: aliases.length,
    canonicalPages: canonicalPaths.length,
    destinations: new Set(aliases.map((alias) => alias.destination)).size,
  };
}

export async function runWwwRedirectSmoke({
  wwwUrl = 'https://www.playfulagency.com',
  canonicalOrigin = CANONICAL_ORIGIN,
  fetchImpl = fetch,
} = {}) {
  const richPath = `/blog/?${ATTRIBUTION_QUERY}`;
  const source = new URL(richPath, wwwUrl);
  const response = await fetchImpl(source, { redirect: 'manual' });
  assert.equal(response.status, 308, 'www should return a permanent 308');
  const location = response.headers.get('location');
  assert.ok(location, 'www redirect should include a Location header');
  const target = new URL(location, source);
  assert.equal(target.origin, canonicalOrigin, 'www should redirect to the apex origin');
  assert.equal(target.pathname, source.pathname, 'www should preserve the path');
  assert.equal(target.search, source.search, 'www should preserve repeated and encoded query parameters');

  const finalResponse = await fetchImpl(target, { redirect: 'manual' });
  assert.ok(!REDIRECT_STATUSES.has(finalResponse.status), 'www should reach apex in one hop');
  assert.equal(finalResponse.status, 200, `www apex destination should return 200, got ${finalResponse.status}`);

  return { status: response.status, destination: `${target.origin}${target.pathname}` };
}

export async function runEndpointProbe({
  endpointUrl = ENDPOINT_PROBE_URL,
  fetchImpl = fetch,
  timeoutMs = 8_000,
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetchImpl(endpointUrl, {
      headers: { Accept: 'application/json' },
      redirect: 'manual',
      signal: controller.signal,
    });
    assert.equal(response.status, 200, `endpoint probe should return 200, got ${response.status}`);
    const payload = await response.json();
    assert.ok(Array.isArray(payload), 'endpoint probe should return a collection');
    return { status: response.status, durationMs: Date.now() - startedAt, items: payload.length };
  } finally {
    clearTimeout(timeout);
  }
}
