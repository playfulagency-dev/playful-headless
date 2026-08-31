import { createRequire } from 'node:module';

import { auditPublicCaseStudySource } from '../lib/content/public-case-study-source-audit.mjs';

const require = createRequire(import.meta.url);
const PUBLIC_CASE_STUDY_OVERRIDES = require('../utils/public-case-study-overrides.json');

const baseUrl = process.env.PUBLIC_CASE_STUDY_WORDPRESS_BASE_URL;
if (!baseUrl) {
  throw new Error('PUBLIC_CASE_STUDY_WORDPRESS_BASE_URL is required');
}

const apiRoot = new URL('/wp-json/wp/v2/casos-de-exito', baseUrl);
const failures = [];

for (const [slug, expected] of Object.entries(PUBLIC_CASE_STUDY_OVERRIDES)) {
  const url = new URL(apiRoot);
  url.searchParams.set('slug', slug);
  url.searchParams.set('_fields', 'slug,title,content,acf');
  url.searchParams.set('acf_format', 'standard');

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    failures.push({ slug, paths: [`http:${response.status}`] });
    continue;
  }

  const records = await response.json();
  if (!Array.isArray(records) || records.length !== 1) {
    failures.push({ slug, paths: ['record-count'] });
    continue;
  }

  const paths = auditPublicCaseStudySource(records[0], slug, expected);
  if (paths.length) failures.push({ slug, paths });
}

if (failures.length) {
  const summary = failures.map(({ slug, paths }) => `${slug}: ${paths.join(', ')}`).join('\n');
  throw new Error(`WordPress source claims audit failed:\n${summary}`);
}

console.log('WordPress source claims audit passed');
