import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isAllowedCaseStudyMediaUrl,
  preserveFeaturedMediaUrl,
} from '../services/case-study-media-policy.mjs';

const allowedUrl = 'https://endpoint.playfulagency.com/wp-content/uploads/2026/09/jumex.png';

test('preserves only an allowlisted featured-media URL for carousel consumers', () => {
  const result = preserveFeaturedMediaUrl(
    { _embedded: { 'wp:featuredmedia': [{ source_url: allowedUrl }] } },
    { slug: 'jumex-shopify-dtc-ecommerce' }
  );

  assert.deepEqual(result, {
    slug: 'jumex-shopify-dtc-ecommerce',
    featured_media_url: allowedUrl,
  });
});

test('rejects media URLs outside the HTTPS WordPress uploads allowlist', () => {
  const rejectedUrls = [
    'http://endpoint.playfulagency.com/wp-content/uploads/case.png',
    'https://endpoint.playfulagency.com:444/wp-content/uploads/case.png',
    'https://endpoint.playfulagency.com/wp-admin/case.png',
    'https://evil.example/wp-content/uploads/case.png',
    'https://user:pass@endpoint.playfulagency.com/wp-content/uploads/case.png',
  ];

  for (const url of rejectedUrls) {
    assert.equal(isAllowedCaseStudyMediaUrl(url), false);
    assert.deepEqual(
      preserveFeaturedMediaUrl(
        { _embedded: { 'wp:featuredmedia': [{ source_url: url }] } },
        { slug: 'case' }
      ),
      { slug: 'case' }
    );
  }
});
