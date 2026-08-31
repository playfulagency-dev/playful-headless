import { runWwwRedirectSmoke } from './seo-smoke-lib.mjs';

const result = await runWwwRedirectSmoke({
  wwwUrl: process.env.SEO_WWW_URL,
  canonicalOrigin: process.env.SEO_CANONICAL_ORIGIN,
});

console.log(
  `WWW smoke passed: ${result.status} -> ${result.destination} `
  + `(canonicalHops=${result.canonicalHops}, trailingHops=${result.trailingHops})`,
);
