// Offline comparison of real Next HTML using one captured public /blog response.
// Usage: node scripts/profile-blog-payload.mjs /absolute/path/captured-blog.html
// Prints a temporary fixture directory; build/start Next, then GET /before and /after.
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, symlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(process.argv[2], 'utf8');
const flight = Buffer.from([...html.matchAll(/self\.__next_f\.push\((.*?)\)<\/script>/gs)]
  .map(m => JSON.parse(m[1])).filter(row => row[0] === 1).map(row => row[1]).join(''));
const records = new Map();
let offset = 0;
while (offset < flight.length) {
  const colon = flight.indexOf(':', offset);
  const id = flight.subarray(offset, colon).toString();
  offset = colon + 1;
  if (flight[offset] === 84) {
    const comma = flight.indexOf(',', offset);
    const length = parseInt(flight.subarray(offset + 1, comma).toString(), 16);
    records.set(id, flight.subarray(comma + 1, comma + 1 + length).toString());
    offset = comma + 1 + length;
  } else {
    const newline = flight.indexOf('\n', offset);
    const row = flight.subarray(offset, newline < 0 ? flight.length : newline).toString();
    try { records.set(id, JSON.parse(row)); } catch { /* module/hint records */ }
    offset = newline < 0 ? flight.length : newline + 1;
  }
}
function dereference(value) {
  if (typeof value === 'string' && /^\$[0-9a-f]+$/.test(value) && records.has(value.slice(1))) {
    return dereference(records.get(value.slice(1)));
  }
  if (Array.isArray(value)) return value.map(dereference);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, dereference(v)]));
  return value;
}
let posts;
function findPosts(value) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.posts) && value.posts[0]?.content && value.posts[0]?.slug) posts = dereference(value.posts);
  for (const child of Object.values(value)) findPosts(child);
}
for (const value of records.values()) findPosts(value);
if (!posts?.length || !posts.every(p => p.content.rendered.startsWith('<'))) throw new Error('Missing complete public blog posts');
const fixture = mkdtempSync(join(tmpdir(), 'playful-blog-profile-'));
const put = (path, content) => writeFileSync(join(fixture, path), content);
const read = path => readFileSync(join(root, path), 'utf8');
const baseline = path => execFileSync('git', ['show', `e9ccb5f:${path}`], { cwd: root, encoding: 'utf8' });
mkdirSync(join(fixture, 'app/before'), { recursive: true });
mkdirSync(join(fixture, 'app/after'), { recursive: true });
symlinkSync(join(root, 'node_modules'), join(fixture, 'node_modules'));
put('package.json', JSON.stringify({ private: true, scripts: { dev: 'next dev' } }));
put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'esnext', jsx: 'preserve', module: 'esnext', moduleResolution: 'bundler', strict: true, esModuleInterop: true, allowImportingTsExtensions: true, paths: { '@/*': [`${root}/*`] } } }));
// Typecheck the real repository separately. This fixture imports repo modules
// from outside its TS project and intentionally only measures their runtime.
put('next.config.js', `module.exports={typescript:{ignoreBuildErrors:true},images:{unoptimized:true},webpack(config){config.resolve.alias['@']=${JSON.stringify(root)};return config;}}`);
put('app/layout.tsx', 'export default function Layout({children}: {children: React.ReactNode}) {return <html lang="es"><body>{children}</body></html>}');
put('posts.json', JSON.stringify(posts));
put('posts.ts', "import posts from './posts.json'; export async function getBlogPosts(page: number, perPage: number, category: string) {return {posts: category ? posts.filter(p => p.categories?.some(c => c.slug === category)) : posts, totalPages: 14};}");
for (const variant of ['before', 'after']) {
  const source = variant === 'before' ? baseline : read;
  put(`app/${variant}/MostViewedArticles.tsx`, source('components/blog/MostViewedArticles.tsx'));
  put(`app/${variant}/page.tsx`, source('app/blog/page.tsx')
    .replace("from '@/services/wordpress'", "from '../../posts'")
    .replace("from '@/components/blog/MostViewedArticles'", "from './MostViewedArticles'"));
  for (const name of ['BlogCategories.tsx', 'BlogListingPagination.tsx']) put(`app/${variant}/${name}`, read(`app/blog/${name}`));
}
console.log(JSON.stringify({ fixture, publicHtmlBytes: Buffer.byteLength(html), postCount: posts.length,
  fullPostsJsonBytes: Buffer.byteLength(JSON.stringify(posts)) }, null, 2));
