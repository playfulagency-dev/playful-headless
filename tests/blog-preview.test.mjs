import test from 'node:test';
import assert from 'node:assert/strict';
import { toBlogPreview } from '../utils/blog-preview.ts';
import { blogPostPath } from '../utils/blog-url.ts';

const post = (id, categories) => ({
  id, slug: `artículo-${id}`, date: '2025-04-22T19:28:54',
  title: { rendered: 'Título &amp; ejemplo' }, categories,
  featured_media_url: 'https://example.com/image.webp', featured_media_alt: '',
  content: { rendered: '<p>Article body</p>'.repeat(10000) },
  excerpt: { rendered: '<p>Excerpt</p>' },
  _embedded: { author: [{ name: 'Author' }] }, meta: { unused: true },
});

test('preview retains every displayed field, URL fallback and image fallback', () => {
  for (const categories of [undefined, [], [{ slug: '' }], [{ slug: 'seo' }, { slug: 'other' }]]) {
    const source = post(1, categories);
    const preview = toBlogPreview(source);
    assert.deepEqual(preview, {
      id: source.id, date: source.date, title: source.title.rendered,
      href: blogPostPath(source), featured_media_url: source.featured_media_url,
      featured_media_alt: source.featured_media_alt,
    });
    assert.equal(preview.featured_media_alt || preview.title, source.title.rendered);
    assert.equal(toBlogPreview({ ...source, featured_media_url: undefined }).featured_media_url, undefined);
  }
});

test('projection preserves all carousel pages, order and source data', () => {
  for (const count of [0, 1, 4, 5, 9, 10]) {
    const posts = Array.from({ length: count }, (_, i) => post(i, [{ slug: 'seo' }]));
    const before = JSON.stringify(posts);
    const previews = posts.map(toBlogPreview);
    assert.deepEqual(previews.map(p => p.id), posts.map(p => p.id));
    for (let i = 0; i < Math.ceil(count / 4); i++) {
      assert.deepEqual(previews.slice(i * 4, (i + 1) * 4).map(p => p.href),
        posts.slice(i * 4, (i + 1) * 4).map(blogPostPath));
    }
    assert.equal(JSON.stringify(posts), before);
  }
});

test('serialized preview excludes article bodies, excerpts, embeds and arbitrary metadata', () => {
  const json = JSON.stringify(toBlogPreview(post(1, [{ slug: 'seo' }])));
  for (const unused of ['content', 'excerpt', '_embedded', 'meta', 'Article body', 'Author']) {
    assert.ok(!json.includes(unused), unused);
  }
});
