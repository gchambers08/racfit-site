# Deploying goracfit.com

Host: **Cloudflare Pages**, building from this repo.
Canonical host: **https://goracfit.com** (apex). www 301s to it.
Forms: **Formspree** (Cloudflare Pages has no built-in form handling).

---

## How a change reaches the live site

1. Edit source: `_pages/*.body.html`, `_parts/*.html`, `assets/css/racfit.css`.
2. `python3 build.py`
3. Commit and push to `main`.
4. Cloudflare Pages sees the push, runs the build, publishes `dist/`. ~1 minute.

Nothing else is manual. There is no zip to upload.

## Cloudflare Pages project settings

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `python3 build.py` |
| Build output directory | `dist` |
| Root directory | *(leave blank)* |
| Production branch | `main` |

`build.py` is standard-library Python 3 only, so any Python in the build image works.

## Why the build outputs twice

`build.py` writes the site in two forms from one source:

- **Repo root `*.html`** — `.html` filenames and `.html` internal links. Double-click
  any of these in Finder and the site works offline. This is the preview copy and
  is not published.
- **`dist/`** — extensionless internal links and canonicals, plus assets, robots.txt,
  sitemap.xml, 404.html and `_redirects`. This is what Cloudflare publishes.

Cloudflare Pages strips `.html` and 308-redirects `/about.html` to `/about`, and that
is not configurable. So on Pages, `.html` cannot be the canonical form — every
internal `.html` link would cost a redirect hop on every click, and the canonical
tags would point at URLs that redirect. Hence `dist/` is extensionless throughout.

`404.html` matters more than it looks: without it, Pages falls back to SPA mode and
serves `index.html` for unknown paths, returning **200 for every typo** and letting
search engines index unlimited soft-404s.

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

- The Function needs `SPARKPOST_API_KEY` and `TURNSTILE_SECRET` set for **both**
  Production and Preview, or forms 503 on preview deployments. Those two are the
  only variables you must set — the Turnstile *site* key is public and committed.
- `/functions` lives at the **repo root**, not inside `dist/`. Cloudflare looks for
  it there and nowhere else; move it into the output directory and every form 404s.

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
