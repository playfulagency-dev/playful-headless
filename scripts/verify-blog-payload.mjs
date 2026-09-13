// GET-only verification against the isolated fixture from profile-blog-payload.mjs.
// Usage: node scripts/verify-blog-payload.mjs http://127.0.0.1:PORT /tmp/output-directory
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'cheerio';

const origin = new URL(process.argv[2]);
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Use the local fixture only');
const output = process.argv[3];
mkdirSync(output, { recursive: true });
const results = [];
for (const [name, query] of [
  ['listing', ''], ['page2', '?page=2'], ['category', '?category=seo'],
  ['empty-category', '?category=e-commerce'],
  ['search', '?search=Zelle'], ['empty', '?search=not-a-real-post-123'],
  ['invalid-page', '?page=0'],
]) {
  const pair = await Promise.all(['before', 'after'].map(async variant => {
    const response = await fetch(new URL(`/${variant}${query}`, origin));
    const html = await response.text();
    writeFileSync(join(output, `${name}-${variant}.html`), html);
    const $ = load(html);
    $('script').remove();
    return { status: response.status, bytes: Buffer.byteLength(html), body: $('body').html(),
      metadata: $('title,meta,link[rel="canonical"]').toString() };
  }));
  const [before, after] = pair;
  assert.equal(after.status, before.status, `${name}: status`);
  assert.equal(after.body, before.body, `${name}: server-rendered body`);
  assert.equal(after.metadata, before.metadata, `${name}: metadata/indexability`);
  const reduction = 1 - after.bytes / before.bytes;
  if (name === 'listing') assert.ok(reduction >= 0.2, 'Initial HTML reduction must reach 20%');
  results.push({ name, status: after.status, beforeBytes: before.bytes, afterBytes: after.bytes,
    reductionPercent: +(reduction * 100).toFixed(2), bodyIdentical: true, metadataIdentical: true });
}
writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
