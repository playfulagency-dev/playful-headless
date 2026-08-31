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
const PERMANENT_REDIRECT_STATUSES = new Set([301, 308]);
const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_STABILITY_RUNS = 3;

export async function fetchWithTimeout(input, {
  fetchImpl = fetch,
  options = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  assert.ok(Number.isInteger(timeoutMs) && timeoutMs > 0, 'request timeout must be a positive integer');
  const controller = new AbortController();
  const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
  const timeout = setTimeout(() => controller.abort(timeoutError), timeoutMs);

  try {
    return await fetchImpl(input, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

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

export function assertSitemapLocations(xml, {
  canonicalOrigin = CANONICAL_ORIGIN,
  excludedPaths = [TEST_BLOG_PATH],
} = {}) {
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1].trim());
  assert.ok(locations.length > 0, 'sitemap must contain at least one loc');
  assert.equal(new Set(locations).size, locations.length, 'sitemap must not contain duplicate URLs');

  for (const location of locations) {
    let url;
    try {
      url = new URL(location);
    } catch {
      assert.fail(`sitemap loc must be an absolute URL: ${location}`);
    }

    assert.equal(url.origin, canonicalOrigin, `sitemap loc must use the exact apex origin: ${location}`);
    assert.equal(url.search, '', `sitemap loc must not include a query: ${location}`);
    assert.equal(url.hash, '', `sitemap loc must not include a fragment: ${location}`);
    const normalizedPath = url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '');
    assert.equal(url.pathname, normalizedPath, `sitemap loc path must be normalized: ${location}`);
    assert.ok(!url.pathname.includes('//'), `sitemap loc path must not contain duplicate slashes: ${location}`);
    assert.equal(location, `${canonicalOrigin}${url.pathname}`, `sitemap loc must use canonical serialization: ${location}`);
    assert.ok(!excludedPaths.includes(url.pathname), `sitemap must exclude ${url.pathname}`);
  }

  return locations;
}

export function assertNoindexFollow(robots, pathname = TEST_BLOG_PATH) {
  assert.equal(robots.length, 1, `${pathname} should emit exactly one robots directive`);
  const tokens = new Set(robots[0].toLowerCase().split(',').map((token) => token.trim()));
  assert.ok(tokens.has('noindex'), `${pathname} should be noindex`);
  assert.ok(tokens.has('follow'), `${pathname} should remain follow`);
  assert.ok(!tokens.has('index'), `${pathname} must not emit conflicting index and noindex directives`);
  assert.ok(!tokens.has('nofollow'), `${pathname} should not be nofollow`);
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

export async function expectTrailingAliasRedirect({
  request,
  baseOrigin,
  alias,
  pathname,
  maxHops = 2,
}) {
  const original = new URL(pathname, baseOrigin);
  const visited = new Set();
  let current = original;

  for (let hop = 1; hop <= maxHops; hop += 1) {
    assert.ok(!visited.has(current.href), `trailing alias loop detected at ${current.href}`);
    visited.add(current.href);
    const response = await request(`${current.pathname}${current.search}`);
    assert.ok(
      PERMANENT_REDIRECT_STATUSES.has(response.status),
      `${pathname} hop ${hop} should be a permanent redirect`,
    );
    const location = response.headers.get('location');
    assert.ok(location, `${pathname} hop ${hop} should include a Location header`);
    const target = new URL(location, baseOrigin);
    assert.equal(target.origin, baseOrigin, `${pathname} should stay on the tested origin`);
    assert.equal(target.search, original.search, `${pathname} must preserve its query on hop ${hop}`);

    if (target.pathname === alias.destination) {
      assert.equal(response.status, alias.status, `${pathname} final alias hop should return ${alias.status}`);
      return { hops: hop, finalUrl: target };
    }

    assert.equal(hop, 1, `${pathname} should reach its exact destination within ${maxHops} hops`);
    assert.equal(response.status, 308, `${pathname} trailing-slash normalization should return 308`);
    assert.equal(target.pathname, alias.source, `${pathname} may only normalize to the exact alias source`);
    current = target;
  }

  assert.fail(`${pathname} should reach ${alias.destination} within ${maxHops} hops`);
}

async function assertDestinationHasNoLoop({ request, baseOrigin, pathname, maxHops = 5, run = 1 }) {
  const visited = new Set();
  let current = new URL(pathname, baseOrigin);

  for (let hop = 0; hop <= maxHops; hop += 1) {
    const key = current.href;
    assert.ok(!visited.has(key), `redirect loop detected at ${key}`);
    visited.add(key);

    const response = await request(`${current.pathname}${current.search}`);
    if (!REDIRECT_STATUSES.has(response.status)) {
      assert.equal(response.status, 200, `${pathname} run ${run} should settle on 200, got ${response.status}`);
      return;
    }

    assert.ok(hop < maxHops, `${pathname} exceeded ${maxHops} redirect hops`);
    const location = response.headers.get('location');
    assert.ok(location, `${current.pathname} should include a Location header`);
    current = new URL(location, baseOrigin);
    assert.equal(current.origin, baseOrigin, `${pathname} redirect chain should stay on the tested origin`);
  }
}

async function assertCanonicalPage({ request, canonicalOrigin, pathname, run = 1 }) {
  const response = await request(`${pathname}?utm_source=seo-preflight`, { redirect: 'follow' });
  assert.equal(response.status, 200, `${pathname} run ${run} should return 200`);
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
  assertNoindexFollow(robots);
}

export async function runSeoSmoke({
  baseUrl,
  canonicalOrigin = CANONICAL_ORIGIN,
  fetchImpl = fetch,
  aliases = ALIASES,
  canonicalPaths = CANONICAL_PATHS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  stabilityRuns = DEFAULT_STABILITY_RUNS,
} = {}) {
  assert.ok(baseUrl, 'SEO_BASE_URL is required, for example https://branch.vercel.app');
  assert.ok(
    Number.isInteger(stabilityRuns) && stabilityRuns >= 1 && stabilityRuns <= 5,
    'stability runs must be an integer between 1 and 5',
  );
  const baseOrigin = new URL(baseUrl).origin;
  const request = (pathname, options = {}) => fetchWithTimeout(new URL(pathname, baseOrigin), {
    fetchImpl,
    timeoutMs,
    options: {
      redirect: 'manual',
      ...options,
    },
  });

  assertAliasInventory(aliases);

  for (const alias of aliases) {
    await expectRedirect({ request, baseOrigin, alias, pathname: alias.source });
    await expectTrailingAliasRedirect({
      request,
      baseOrigin,
      alias,
      pathname: `${alias.source}/?${ATTRIBUTION_QUERY}`,
    });
  }

  const destinations = [...new Set(aliases.map((alias) => alias.destination))];
  for (let run = 1; run <= stabilityRuns; run += 1) {
    for (const destination of destinations) {
      await assertDestinationHasNoLoop({ request, baseOrigin, pathname: destination, run });
    }
  }

  for (let run = 1; run <= stabilityRuns; run += 1) {
    for (const pathname of canonicalPaths) {
      await assertCanonicalPage({ request, canonicalOrigin, pathname, run });
    }
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
  assertSitemapLocations(sitemap, { canonicalOrigin });

  await assertTestBlogNoindex({ request });

  return {
    aliases: aliases.length,
    canonicalPages: canonicalPaths.length,
    destinations: destinations.length,
    stabilityRuns,
  };
}

export async function runWwwRedirectSmoke({
  wwwUrl = 'https://www.playfulagency.com',
  canonicalOrigin = CANONICAL_ORIGIN,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const request = (input) => fetchWithTimeout(input, {
    fetchImpl,
    timeoutMs,
    options: { redirect: 'manual' },
  });

  async function firstHop(pathname) {
    const source = new URL(`${pathname}?${ATTRIBUTION_QUERY}`, wwwUrl);
    const response = await request(source);
    assert.equal(response.status, 308, `${source.pathname} on www should return a permanent 308`);
    const location = response.headers.get('location');
    assert.ok(location, 'www redirect should include a Location header');
    const target = new URL(location, source);
    assert.equal(target.origin, canonicalOrigin, 'www should redirect to the apex origin');
    assert.equal(target.pathname, source.pathname, 'www should preserve the path on its first hop');
    assert.equal(target.search, source.search, 'www should preserve repeated and encoded query parameters');
    return target;
  }

  async function settleOnApex(start, maxAdditionalHops) {
    const visited = new Set();
    let current = start;
    let additionalHops = 0;

    while (true) {
      assert.ok(!visited.has(current.href), `www redirect loop detected at ${current.href}`);
      visited.add(current.href);
      const response = await request(current);
      if (!REDIRECT_STATUSES.has(response.status)) {
        assert.equal(response.status, 200, `www apex destination should return 200, got ${response.status}`);
        return { finalUrl: current, totalHops: 1 + additionalHops };
      }

      assert.ok(additionalHops < maxAdditionalHops, 'www exceeded the allowed redirect hops');
      const location = response.headers.get('location');
      assert.ok(location, 'apex normalization redirect should include a Location header');
      const target = new URL(location, current);
      assert.equal(target.origin, canonicalOrigin, 'www chain should remain on the apex origin');
      assert.equal(target.search, current.search, 'apex normalization must preserve the query');
      current = target;
      additionalHops += 1;
    }
  }

  const canonicalTarget = await firstHop('/blog');
  const canonicalResult = await settleOnApex(canonicalTarget, 0);
  const trailingTarget = await firstHop('/blog/');
  const trailingResult = await settleOnApex(trailingTarget, 1);
  assert.equal(trailingResult.finalUrl.pathname, '/blog', 'trailing slash should normalize to /blog');

  return {
    status: 308,
    destination: `${canonicalTarget.origin}${canonicalTarget.pathname}`,
    canonicalHops: canonicalResult.totalHops,
    trailingHops: trailingResult.totalHops,
  };
}

export async function runEndpointProbe({
  endpointUrl = ENDPOINT_PROBE_URL,
  fetchImpl = fetch,
  timeoutMs = 8_000,
} = {}) {
  const startedAt = Date.now();
  const response = await fetchWithTimeout(endpointUrl, {
    fetchImpl,
    timeoutMs,
    options: {
      headers: { Accept: 'application/json' },
      redirect: 'manual',
    },
  });
  assert.equal(response.status, 200, `endpoint probe should return 200, got ${response.status}`);
  const payload = await response.json();
  assert.ok(Array.isArray(payload), 'endpoint probe should return a collection');
  return { status: response.status, durationMs: Date.now() - startedAt, items: payload.length };
}
