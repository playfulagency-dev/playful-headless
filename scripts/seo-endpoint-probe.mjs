import { runEndpointProbe } from './seo-smoke-lib.mjs';

const result = await runEndpointProbe({ endpointUrl: process.env.SEO_ENDPOINT_URL });

// Do not print response bodies: status, timing and collection cardinality are enough for QA.
console.log(
  `Endpoint probe passed: status=${result.status} durationMs=${result.durationMs} items=${result.items}`,
);
