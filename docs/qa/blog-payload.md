# Blog client payload — 2026-09-13

Approved card: [86cbh2p35](https://app.clickup.com/t/86cbh2p35). Baseline code: `e9ccb5f`.

`app/blog/page.tsx` previously passed complete WordPress posts to the client
component `MostViewedArticles`. That component consumes only identifiers, dates,
titles, article URLs and featured-image URL/alt text. It does not consume article
bodies, excerpts, embedded media sizes, authors, metadata or other WP fields.

The server now maps every already-selected post through `toBlogPreview` before
that client boundary. The URL is computed by the existing `blogPostPath` helper.
No posts are removed or reordered; the original server-side post objects still
render the featured article and grid. Filtering, fetching, pagination, canonical,
robots, styles and carousel state/controls are unchanged.

## Measurements

GET `https://playfulagency.com/blog` captured 522,314 uncompressed HTML bytes.
The earlier audit reported 522,271; the fresh capture is the input for this run.
SHA-256: `c269ecbaa47e33d84b90d9085a3e8aa09ade911f7949e71a99e8ec6d8476ee5e`.
The capture contains all 10 posts, totaling 352,304 bytes as ordinary JSON.

An isolated **production Next 15.5.25 build** rendered the real baseline and
changed blog page/components against those exact frozen posts. Only the WP
service import is replaced by an offline fixture; both variants use the same
minimal root layout and image configuration. Measurements are complete HTTP
HTML response bodies, including Next's Flight serialization, not JSON estimates.

| Fixture case | Before bytes | After bytes | Reduction |
| --- | ---: | ---: | ---: |
| Initial listing | 461,841 | 64,483 | 86.04% |
| Page 2 controls | 462,001 | 64,643 | 86.01% |
| SEO category | 98,260 | 27,637 | 71.87% |
| Search Zelle | 62,327 | 24,154 | 61.25% |
| Empty category | 14,189 | 14,182 | 0.05% |
| Empty search | 18,989 | 18,981 | 0.04% |
| Invalid page (404) | 7,215 | 7,212 | 0.04% |

The initial response saves 397,358 bytes, exceeding the 20% target in the
controlled HTML comparison. **86.04% is a local fixture result, not a measured
production reduction.** The fixture omits the shared production header/footer
and uses unoptimized image URLs identically for both variants. Differences of a
few bytes in empty cases are route/module serialization overhead. No deployment
has occurred and no post-change public response exists yet.

Every case has byte-identical server-rendered body after removing scripts and
identical title/meta/canonical markup, plus matching HTTP status. The page-2 case
tests controls/metadata with the same ten-post fixture; it does not claim a
fresh capture of production page-2 posts. Category cases filter that fixture.

## Verification and reproduction

- `npm run test:blog-payload`: 3 passing tests cover preserved display fields,
  primary-category/fallback URLs, absent image/alt fallback, all posts and order
  across carousel page boundaries (0/1/4/5/9/10 posts), source immutability and
  absence of article bodies/embeds/metadata in serialized previews.
- `npm run test:canonical`: 107 passing tests, including listing pagination,
  robots, category redirects and closed-post behavior.
- `npm run typecheck`: passes using the repository's actual configuration.
- `git diff --check`: passes.
- Isolated Next production build and seven HTTP comparisons: pass.

```sh
curl -fsSL https://playfulagency.com/blog -o /tmp/blog-capture.html
node scripts/profile-blog-payload.mjs /tmp/blog-capture.html
# In the temporary fixture directory printed by the script:
node node_modules/next/dist/bin/next build
node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3197
# From the repository, while that server runs:
node scripts/verify-blog-payload.mjs http://127.0.0.1:3197 /tmp/blog-evidence
```

The fixture build skips its own cross-project TypeScript check because importing
repository JS modules from the temporary TS project changes their inferred types.
The real repository typecheck above passes; application build settings are not
changed. The scripts never read `.env` or access WordPress integrations.

Local evidence for this run: `/private/tmp/playful-blog-payload-baseline.html`
and `/private/tmp/playful-blog-payload-evidence/` (seven before/after HTML pairs
and `results.json`). The isolated build is under
`/var/folders/w_/pdfn_d7d1m7ft7b_p8jfh57r0000gn/T/playful-blog-profile-kdgea1`.
These captures are not committed. No push, deployment, form submission or
integration change was performed.

## Independent coordinator review

Reviewed the full patch, fixture construction, URL mapping and all callers of
MostViewedArticles (only the blog index). Re-ran the three projection tests,
repository TypeScript check and all seven GET comparisons against the built
fixture: identical results, including 461,841 → 64,483 bytes for the listing.
No critical regression identified. Controls/state logic and styles are unchanged.
Evidence: `/private/tmp/playful-blog-independent-evidence/results.json`.
This review does not replace PR checks, deployed-artifact verification or the
post-publication measurement; no production performance claim is made.
