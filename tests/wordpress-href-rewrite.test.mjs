import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { rewriteInSitePageHrefs } from '../services/rewrite-in-site-hrefs.mjs';

const LINKEDIN_POST =
  'https://endpoint.playfulagency.com/blog/pautas-digitales/anuncios-en-linkedin';
const BLACK_FRIDAY_POST =
  'https://endpoint.playfulagency.com/blog/email-marketing/como-promocionar-en-black-friday-implementa-estas-estrategias';
const MEDIA_SRC =
  'https://endpoint.playfulagency.com/wp-content/uploads/2024/11/hero.jpg';
const MEDIA_HREF =
  'https://endpoint.playfulagency.com/wp-content/uploads/2024/11/guia.pdf';

function countHostHrefs(html, host) {
  const re = new RegExp(`href=(["'])https?://${host.replaceAll('.', '\\.')}[^"']*\\1`, 'gi');
  return (html.match(re) || []).length;
}

test('rewrites endpoint, old, www, and apex in-site hrefs to same-path relatives', () => {
  const html = [
    `<a href="${LINKEDIN_POST}">LinkedIn</a>`,
    `<a href="${BLACK_FRIDAY_POST}">Black Friday</a>`,
    `<a href="https://old.playfulagency.com/blog/email-marketing/como-promocionar-en-black-friday-implementa-estas-estrategias">old</a>`,
    `<a href="https://www.playfulagency.com/blog/pautas-digitales/anuncios-en-linkedin">www</a>`,
    `<a href="https://playfulagency.com/blog/pautas-digitales/anuncios-en-linkedin">apex</a>`,
    `<a href="//endpoint.playfulagency.com/blog/pautas-digitales/anuncios-en-linkedin?utm=1#toc">proto</a>`,
  ].join('');

  const rewritten = rewriteInSitePageHrefs(html);

  assert.equal(countHostHrefs(rewritten, 'endpoint.playfulagency.com'), 0);
  assert.equal(countHostHrefs(rewritten, 'old.playfulagency.com'), 0);
  assert.equal(countHostHrefs(rewritten, 'www.playfulagency.com'), 0);
  assert.equal(countHostHrefs(rewritten, 'playfulagency.com'), 0);
  assert.match(rewritten, /href="\/blog\/pautas-digitales\/anuncios-en-linkedin"/);
  assert.match(
    rewritten,
    /href="\/blog\/email-marketing\/como-promocionar-en-black-friday-implementa-estas-estrategias"/,
  );
  assert.match(
    rewritten,
    /href="\/blog\/pautas-digitales\/anuncios-en-linkedin\?utm=1#toc"/,
  );
});

test('leaves /wp-content media srcs and hrefs on the WordPress endpoint', () => {
  const html = [
    `<img src="${MEDIA_SRC}" alt="">`,
    `<a href="${MEDIA_HREF}">PDF</a>`,
    `<a href="${LINKEDIN_POST}">LinkedIn</a>`,
  ].join('');

  const rewritten = rewriteInSitePageHrefs(html);

  assert.match(rewritten, new RegExp(`src="${MEDIA_SRC.replaceAll('/', '\\/')}"`));
  assert.match(rewritten, new RegExp(`href="${MEDIA_HREF.replaceAll('/', '\\/')}"`));
  assert.match(rewritten, /href="\/blog\/pautas-digitales\/anuncios-en-linkedin"/);
  assert.equal(countHostHrefs(rewritten, 'endpoint.playfulagency.com'), 1);
});

test('does not rewrite external or already-relative hrefs', () => {
  const html = [
    `<a href="https://linkedin.com/company/playful">external</a>`,
    `<a href="/blog/already-relative">relative</a>`,
    `<a href="#local">hash</a>`,
  ].join('');

  assert.equal(rewriteInSitePageHrefs(html), html);
});

test('getBlogPostBySlug maps content.rendered through rewriteInSitePageHrefs', async () => {
  const source = await readFile(new URL('../services/wordpress.ts', import.meta.url), 'utf8');
  const start = source.indexOf('export async function getBlogPostBySlug');
  assert.notEqual(start, -1);
  const nextExport = source.indexOf('\nexport ', start + 1);
  const body = nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
  assert.match(body, /rewriteInSitePageHrefs\(/);
  assert.match(body, /content\.rendered/);
});
