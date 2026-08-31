# SEO and infrastructure preflight

This package is a reversible, read-only QA gate for redirects, public SEO
metadata, `www` and the WordPress endpoint. It does not change DNS, hosting,
WordPress, inherited subdomains or production deployments.

## Baseline and intended use

- Branch baseline: `devplayful/playful-headless` `main` at `a108e17`.
- PR26 is already represented by this baseline.
- PR29 is not merged into this baseline. Run this package against a PR29 Preview
  URL after that Preview is available; do not infer PR29 stability from unit
  tests alone.
- Use only public GET requests. The scripts do not submit forms or call mutation
  endpoints.

## Coverage

The fixed inventory in `scripts/seo-preflight-config.mjs` contains exactly:

- 5 general 301 aliases: `/servicios`, `/services`, `/contacto`, `/contactanos`
  and `/casos`.
- 17 WordPress-derived blog aliases, captured from the public inventory on
  2026-08-31. The snapshot is intentional: inventory drift must be reviewed,
  not silently accepted.
- 12 representative canonical pages: Home; the four service pages; contact;
  case-study index and Jumex case; blog index and a canonical blog post; podcast
  index and one episode.

For every alias the live smoke checks the plain path and a trailing-slash variant
with repeated and encoded attribution parameters. The plain path must use its
exact configured 301/308. A trailing variant may resolve directly or first use a
308 to remove the slash, but it must reach the exact configured destination in no
more than two permanent hops. Every hop stays on the tested origin and preserves
the byte-equivalent query. The fixture models the observed two-hop behavior.

The 20 unique destinations and 12 canonical pages run three times by default,
sequentially and in fixed inventory order. Each destination retains loop detection
and a five-hop ceiling. Set `SEO_STABILITY_RUNS` only to an integer from 1 to 5;
the acceptance default remains 3.

For every canonical page it requires HTTP 200, exactly one canonical and exactly
one `og:url`, both equal to the query-free, slash-normalized apex URL. Host-leak
checks apply to SEO identity fields and sitemap entries; WordPress asset URLs are
not treated as canonical leaks.

The main smoke also confirms that invalid blog paths remain 404. Every parsed
sitemap `loc` must use the exact apex origin, omit query and fragment, use a
normalized path, be unique and exclude `/test-blog`. The diagnostic route must
emit exactly `noindex,follow`, without a conflicting `index` or `nofollow`.

Every smoke request has an eight-second AbortSignal timeout, including the
separate `www` and endpoint probes.

## Commands

Run the deterministic offline suite first:

```sh
npm run test:seo:unit
```

Run the full read-only smoke against a Preview URL:

```sh
SEO_BASE_URL=https://exact-preview.example npm run test:seo
```

With the default three stability runs, the observed two-hop trailing aliases and
destinations that settle directly on 200, the nominal run performs 166 sequential
GET requests: 66 alias-chain requests, 60 destination checks, 36 metadata checks,
two negative blog checks, sitemap and `/test-blog`. A destination redirect may
add controlled hops before the five-hop ceiling. Do not parallelize the smoke
against the shared WordPress origin.

The `www` check is separate and optional because it targets the public domain,
not a branch Preview. It verifies both `/blog` and `/blog/`, using at most five
GET requests in total. The canonical path must reach apex in one 308 hop; the
trailing-slash path may use one additional 308 to normalize the slash. Every hop
must preserve the repeated and encoded query, remain on apex and avoid loops:

```sh
npm run test:seo:www
```

Override only when testing a controlled equivalent:

```sh
SEO_WWW_URL=https://www.playfulagency.com npm run test:seo:www
```

The endpoint probe is also separate. It performs exactly one GET with
`per_page=1` and `_fields=id,slug`. Output is limited to status, duration and
collection cardinality; it never prints the response body:

```sh
npm run test:seo:endpoint
```

## Acceptance gate

Accept the Preview only when all of the following hold:

1. Unit tests, TypeScript and `git diff --check` pass.
2. The full smoke passes against the exact Preview URL.
3. `www` sends the canonical path to apex in one 308, and the trailing-slash
   variant settles on the canonical path in no more than two 308 hops, with the
   repeated/encoded query intact throughout.
4. The endpoint probe returns 200 within its eight-second ceiling.
5. All three deterministic sequential runs for destinations and canonicals avoid
   transient 404/5xx responses.
6. A new independent review confirms the two-hop fixtures, timeout behavior,
   sitemap negatives and robots conflict rejection before Preview approval.

A transient WordPress 5xx or false 404 is a failed stability gate, not permission
to relax the assertions or remove a legacy hostname.

## Risks and limits

- The 17 blog aliases are a dated snapshot. New WordPress category assignments
  require an explicit inventory review and test update.
- `/test-blog` remains publicly reachable. `noindex` is an indexing directive,
  not access control or confidentiality protection.
- Canonical checks cover representative routes rather than every sitemap entry.
- A Preview protected by authentication needs the normal authorized QA access;
  do not place bypass secrets in commands, logs or documentation.
- `endpoint.playfulagency.com` is an active dependency and is not a retirement
  candidate. The probe does not establish backup integrity or ownership.
- No result from this package authorizes deletion of inherited subdomains. Their
  retirement remains blocked on private traffic, dependency and restorable-backup
  evidence.

## Rollback

No external state is changed by the tests. Before merge, discard the branch or
Preview. After a future merge, revert all commits from this branch in reverse
order; do not partially retain fixtures that no longer match the smoke behavior.
The `/test-blog` metadata commit can be reverted independently only when the
indexing decision itself changes.

Do not roll back PR26 redirects, change DNS, remove hosting roots or alter
WordPress as part of this rollback.
