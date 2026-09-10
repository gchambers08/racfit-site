# Deploying goracfit.com

Host: **Cloudflare Workers with static assets**, building from this repo.
Cloudflare retired new Pages projects, so this is the Workers equivalent: the
static pages are served from `dist/client`, and the form handler is compiled into
`dist/worker`.
Canonical host: **https://goracfit.com** (apex). www 301s to it.
Forms: **Formspree** (Cloudflare Pages has no built-in form handling).

---

## How a change reaches the live site

1. Edit source: `_pages/*.body.html`, `_parts/*.html`, `assets/css/racfit.css`.
2. `python3 build.py`
3. Commit and push to `main`.
4. Cloudflare Pages sees the push, runs the build, publishes `dist/`. ~1 minute.

Nothing else is manual. There is no zip to upload.

## Cloudflare project settings

| Setting | Value |
|---|---|
| Project name | `racfit-site` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |

Everything else comes from `wrangler.jsonc`, which is the real source of truth for
the deploy: the assets directory, the 404 behaviour, and the Worker routing.

`npm run build` runs `python3 build.py` and nothing else. `build.py` is
standard-library Python 3 only, so any Python in the build image works, and there
are no npm dependencies to install.

The form handler at `src/index.js` is deployed as written — no compile step. It
began life in the Pages Functions layout, compiled by
`wrangler pages functions build`, but that step was one more thing to fail in CI
and bought nothing for a single dynamic route.

### The one setting that is easy to get wrong

`wrangler.jsonc` sets `run_worker_first: ["/api/*"]`. It has to.

With the default (`false`), the asset layer answers anything that matches no
asset by applying `not_found_handling` — it does **not** fall through to the
Worker. A POST to `/api/contact` would be answered with the 404 page and **every
form would fail silently**. Scoping it to `/api/*` sends only the form endpoints
to the Worker and leaves all 166 static files served straight from the edge,
which `run_worker_first: true` would not do.

Verified against a local Worker runtime:

| Request | Result |
|---|---|
| `GET /` | 200 |
| `GET /about` | 200, serves about.html |
| `GET /about.html` | 307 to `/about` |
| `GET /nope` | 404, serves 404.html |
| `POST /api/contact` | reaches the handler |
| `GET /api/contact` | 405 |
| `POST /api/not-a-form` | 404 |

## Why the build outputs twice

`build.py` writes the site in two forms from one source:

- **Repo root `*.html`** — `.html` filenames and `.html` internal links. Double-click
  any of these in Finder and the site works offline. This is the preview copy and
  is not deployed.
- **`dist/client/`** — extensionless internal links and canonicals, plus assets,
  robots.txt, sitemap.xml, 404.html and `_redirects`. This is what Cloudflare serves.

Cloudflare serves `/about` from `about.html` and 307-redirects `/about.html` to
`/about` (`html_handling: auto-trailing-slash`, the default, confirmed by test).
There is no mode that preserves `.html`, so `.html` cannot be the canonical form —
every internal `.html` link would cost a redirect hop on every click, and the
canonical tags would point at URLs that redirect. Hence `dist/client/` is
extensionless throughout.

`404.html` plus `not_found_handling: "404-page"` matters more than it looks:
without them the default falls back to `index.html` for unknown paths, returning
**200 for every typo** and letting search engines index unlimited soft-404s.

## The three settings that must agree

The canonical host appears in three places. Change one, change all three:

1. `HOST` in `build.py`
2. the host rule in `redirects/build-redirects.py` (then re-run it)
3. every `<loc>` in `sitemap.xml`, plus the `Sitemap:` line in `robots.txt`

## Redirects

`redirects/redirect-map.csv` is the source of truth — 72 rows from the old
WordPress site. Edit it, then:

    cd redirects && python3 build-redirects.py ..

That regenerates all four server formats and fails loudly if a target page or
anchor no longer exists. `build.py` copies the extensionless variant into
`dist/_redirects`, which is where Cloudflare reads it.

Do **not** add `Disallow` lines for the old WordPress paths in robots.txt. A blocked
URL is one Google cannot fetch, so it never sees the 301 and the link equity does
not transfer.

## Forms

Seven forms, all handled by `functions/api/[form].js` - a Cloudflare Pages Function
that verifies Turnstile and sends through SparkPost. No third-party form service.

Full detail, including the environment variables you must set, is in **FORMS.md**.
Two things that will bite if missed:

- The Worker needs `SPARKPOST_API_KEY` and `TURNSTILE_SECRET` as **secrets**
  (Worker → Settings → Variables and Secrets). Those two are the only ones you
  must set — the Turnstile *site* key is public and committed.
- `src/index.js` is the Worker, deployed as source. `wrangler.jsonc` points at it
  via `main`. Do not move it into `dist/`, which is rebuilt and is gitignored.

After touching any form, run `python3 check-forms.py`. It compares the markup
against the handler's field registry and fails on a mismatch - which is otherwise
a silent failure where a renamed field just stops arriving.

## Go-live order

1. Cloudflare Pages project builds and serves a preview URL. Check it end to end.
2. Add `goracfit.com` and `www.goracfit.com` as custom domains in Pages.
3. **Only then** point DNS at Cloudflare. This is the cutover — the old WordPress
   site stops serving at this moment.
4. Verify the redirects: every old URL should return a single 301 to a 200.
5. Submit `https://goracfit.com/sitemap.xml` in Google Search Console.
6. Watch Search Console's Pages report for two weeks.
