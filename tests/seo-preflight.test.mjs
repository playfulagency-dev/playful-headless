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
  assertNoindexFollow,
  assertSitemapLocations,
  expectRedirect,
  expectTrailingAliasRedirect,
  extractSeoMetadata,
  fetchWithTimeout,
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

function createFixtureFetch({ requests = [], sitemapLocations = CANONICAL_PATHS, robots = 'noindex, follow' } = {}) {
  const aliasBySource = new Map(ALIASES.map((alias) => [alias.source, alias]));
  const destinations = new Set(ALIASES.map((alias) => alias.destination));
  return async (input, options = {}) => {
    const url = new URL(input);
    requests.push({ href: url.href, signal: options.signal });
    const normalizedPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    const alias = aliasBySource.get(normalizedPath);

    if (alias) {
      if (url.pathname.endsWith('/')) {
        return new Response(null, {
          status: 308,
          headers: { Location: `${alias.source}${url.search}` },
        });
      }
      return new Response(null, {
        status: alias.status,
        headers: { Location: `${alias.destination}${url.search}` },
      });
    }

    if (url.pathname === '/sitemap.xml') {
      const locations = sitemapLocations
        .map((pathname) => `<loc>${pathname === '/' ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${pathname}`}</loc>`)
        .join('');
      return new Response(`<urlset>${locations}</urlset>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' },
      });
    }

    if (url.pathname === TEST_BLOG_PATH) {
      return new Response(`<html><head><meta name="robots" content="${robots}"></head></html>`, {
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

test('trailing aliases allow one or two permanent hops and require the exact final destination', async () => {
  const alias = GENERAL_ALIASES[0];
  const directRequest = async () => new Response(null, {
    status: alias.status,
    headers: { Location: `${alias.destination}?utm_content=one&utm_content=two&gclid=a%2Bb` },
  });
  const direct = await expectTrailingAliasRedirect({
    request: directRequest,
    baseOrigin: baseUrl,
    alias,
    pathname: `${alias.source}/?utm_content=one&utm_content=two&gclid=a%2Bb`,
  });
  assert.equal(direct.hops, 1);

  let call = 0;
  const normalizedRequest = async () => {
    call += 1;
    return call === 1
      ? new Response(null, {
        status: 308,
        headers: { Location: `${alias.source}?utm_content=one&utm_content=two&gclid=a%2Bb` },
      })
      : new Response(null, {
        status: alias.status,
        headers: { Location: `${alias.destination}?utm_content=one&utm_content=two&gclid=a%2Bb` },
      });
  };
  const normalized = await expectTrailingAliasRedirect({
    request: normalizedRequest,
    baseOrigin: baseUrl,
    alias,
    pathname: `${alias.source}/?utm_content=one&utm_content=two&gclid=a%2Bb`,
  });
  assert.equal(normalized.hops, 2);

  const wrongDestinationRequest = async () => new Response(null, {
    status: 308,
    headers: { Location: `/intermediate?utm_content=one&utm_content=two&gclid=a%2Bb` },
  });
  await assert.rejects(
    expectTrailingAliasRedirect({
      request: wrongDestinationRequest,
      baseOrigin: baseUrl,
      alias,
      pathname: `${alias.source}/?utm_content=one&utm_content=two&gclid=a%2Bb`,
    }),
    /exact alias source/,
  );

  const queryDroppingRequest = async () => new Response(null, {
    status: 308,
    headers: { Location: alias.source },
  });
  await assert.rejects(
    expectTrailingAliasRedirect({
      request: queryDroppingRequest,
      baseOrigin: baseUrl,
      alias,
      pathname: `${alias.source}/?utm_content=one&utm_content=two&gclid=a%2Bb`,
    }),
    /preserve its query on hop 1/,
  );
});

test('runs the full redirect, canonical, sitemap and noindex preflight', async () => {
  const requests = [];
  const result = await runSeoSmoke({ baseUrl, fetchImpl: createFixtureFetch({ requests }) });
  assert.deepEqual(result, {
    aliases: 22,
    canonicalPages: 12,
    destinations: 20,
    stabilityRuns: 3,
  });

  const destinations = [...new Set(ALIASES.map((alias) => alias.destination))];
  const destinationRequests = requests
    .map(({ href }) => new URL(href))
    .filter((url) => destinations.includes(url.pathname) && url.search === '')
    .map((url) => url.pathname);
  assert.deepEqual(
    destinationRequests,
    Array.from({ length: 3 }, () => destinations).flat(),
    'destinations should repeat sequentially in fixed inventory order',
  );

  const canonicalRequests = requests
    .map(({ href }) => new URL(href))
    .filter((url) => CANONICAL_PATHS.includes(url.pathname) && url.search === '?utm_source=seo-preflight')
    .map((url) => url.pathname);
  assert.deepEqual(
    canonicalRequests,
    Array.from({ length: 3 }, () => CANONICAL_PATHS).flat(),
    'canonicals should repeat sequentially in fixed matrix order',
  );
  assert.ok(requests.every(({ signal }) => signal instanceof AbortSignal));
});

test('sitemap parser enforces exact origin, clean normalized paths and test-blog exclusion', () => {
  const valid = [
    '<urlset>',
    `<url><loc>${CANONICAL_ORIGIN}/</loc></url>`,
    `<url><loc>${CANONICAL_ORIGIN}/blog</loc></url>`,
    '</urlset>',
  ].join('');
  assert.deepEqual(assertSitemapLocations(valid), [`${CANONICAL_ORIGIN}/`, `${CANONICAL_ORIGIN}/blog`]);

  for (const invalidLocation of [
    'https://www.playfulagency.com/blog',
    'https://playfulagency.com.evil.example/blog',
    'https://playfulagency.com/blog?utm_source=bad',
    'https://playfulagency.com/blog#fragment',
    'https://playfulagency.com/blog/',
    'https://playfulagency.com/blog//post',
    'https://playfulagency.com:443/blog',
    'https://playfulagency.com/a/../blog',
    'https://playfulagency.com/test-blog',
  ]) {
    assert.throws(
      () => assertSitemapLocations(`<urlset><url><loc>${invalidLocation}</loc></url></urlset>`),
      /sitemap/,
      invalidLocation,
    );
  }
});

test('robots validation rejects conflicting index and noindex directives', () => {
  assertNoindexFollow(['noindex, follow']);
  assert.throws(
    () => assertNoindexFollow(['index, noindex, follow']),
    /conflicting index and noindex/,
  );
});

test('request timeout provides and aborts an AbortSignal', async () => {
  let observedSignal;
  const hangingFetch = async (_input, options) => {
    observedSignal = options.signal;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    });
  };
  await assert.rejects(
    fetchWithTimeout('https://preview.example/slow', { fetchImpl: hangingFetch, timeoutMs: 5 }),
    /timed out after 5ms/,
  );
  assert.ok(observedSignal instanceof AbortSignal);
  assert.equal(observedSignal.aborted, true);
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

test('www smoke rejects every non-308 apex normalization redirect', async (t) => {
  for (const status of [301, 302, 303, 307]) {
    await t.test(`rejects ${status}`, async () => {
      const fetchImpl = async (input) => {
        const url = new URL(input);
        if (url.hostname === 'www.playfulagency.com') {
          return new Response(null, {
            status: 308,
            headers: { Location: `${CANONICAL_ORIGIN}${url.pathname}${url.search}` },
          });
        }
        if (url.pathname === '/blog/') {
          return new Response(null, {
            status,
            headers: { Location: `/blog${url.search}` },
          });
        }
        return new Response('ok', { status: 200 });
      };

      await assert.rejects(
        runWwwRedirectSmoke({ fetchImpl }),
        /apex normalization redirect should return 308/,
      );
    });
  }
});

test('www smoke aborts a request that exceeds its timeout', async () => {
  let observedSignal;
  const hangingFetch = async (_input, options) => {
    observedSignal = options.signal;
    return new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    });
  };
  await assert.rejects(
    runWwwRedirectSmoke({ fetchImpl: hangingFetch, timeoutMs: 5 }),
    /timed out after 5ms/,
  );
  assert.ok(observedSignal instanceof AbortSignal);
  assert.equal(observedSignal.aborted, true);
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
  assert.ok(requests[0].options.signal instanceof AbortSignal);
});
