import { runSeoSmoke } from './seo-smoke-lib.mjs';

const result = await runSeoSmoke({
  baseUrl: process.env.SEO_BASE_URL,
  canonicalOrigin: process.env.SEO_CANONICAL_ORIGIN,
  stabilityRuns: process.env.SEO_STABILITY_RUNS
    ? Number(process.env.SEO_STABILITY_RUNS)
    : undefined,
});

console.log(
  `SEO smoke passed: ${result.aliases} aliases, ${result.destinations} destinations, `
  + `${result.canonicalPages} canonical pages, ${result.stabilityRuns} stability runs`,
);
