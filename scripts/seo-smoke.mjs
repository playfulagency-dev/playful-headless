import { runSeoSmoke } from './seo-smoke-lib.mjs';

const result = await runSeoSmoke({
  baseUrl: process.env.SEO_BASE_URL,
  canonicalOrigin: process.env.SEO_CANONICAL_ORIGIN,
});

console.log(
  `SEO smoke passed: ${result.aliases} aliases, ${result.destinations} destinations, `
  + `${result.canonicalPages} canonical pages`,
);
