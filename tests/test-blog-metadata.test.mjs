import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const sourceUrl = new URL('../app/test-blog/page.tsx', import.meta.url);

test('/test-blog stays available but is excluded from indexing', async () => {
  const source = await readFile(sourceUrl, 'utf8');
  assert.match(source, /robots:\s*{\s*index:\s*false,\s*follow:\s*true\s*}/);
  assert.match(source, /alternates:\s*{\s*canonical:\s*TEST_BLOG_URL\s*}/);
  assert.match(source, /openGraph:\s*{\s*url:\s*TEST_BLOG_URL\s*}/);
});
