#!/usr/bin/env python3
"""RacFit static site assembler.

Builds the site twice, from one source, into two forms:

  <root>/*.html   .html filenames and .html internal links.
                  Double-click any of these in Finder and the site works
                  offline, exactly as it always has.

  dist/client/    extensionless internal links and canonicals, plus assets,
                  robots.txt, sitemap.xml, 404.html and _redirects.
                  This is the static asset directory Cloudflare serves.
                  The Worker itself is src/index.js, deployed as source.

  dist/worker/    NOT written here - the Cloudflare build step compiles
                  functions/ into it with `wrangler pages functions build`.

Why two. Cloudflare serves /about from about.html and 307-redirects
/about.html to /about (html_handling: auto-trailing-slash, the default).
That is not configurable to preserve .html, so .html cannot be the canonical
form - every internal .html link would cost a redirect hop on every click,
and the canonical tags would point at URLs that redirect. dist/client/ is
therefore extensionless throughout. Generating it rather than converting the
source keeps local preview working the way Grant reviews.

Each body file starts with:
  <!--TITLE: ... -->
  <!--DESC: ... -->
  <!--OG: filename-in-assets-img.jpg -->   (optional)

Run:  python3 build.py
"""
import os, re, glob, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
DIST = P('dist', 'client')

# Canonical host. Apex, not www - the redirect config sends www here.
# Change this, the host rule in redirects/redirect-map.csv and sitemap.xml
# together; all three have to agree.
HOST = 'https://goracfit.com'

# Turnstile's SITE key. Committed on purpose: it is not a secret. It ships in the
# page source of every form by design, and Turnstile enforces which hostnames may
# use it. The matching SECRET key is what must never be in the repo - that lives
# only as an encrypted Pages environment variable, TURNSTILE_SECRET.
#
# Committing it rather than reading it from the build environment means a local
# build produces the same HTML as Cloudflare's, so a form tested locally is the
# form that ships. The env var still wins, for a second site or a test widget.
TURNSTILE_SITEKEY = os.environ.get(
    'TURNSTILE_SITEKEY', '0x4AAAAAAEuQSp9DKqOTBzUg')

# Copied into dist as-is. _redirects is consumed by Cloudflare Pages at the
# site root, not served.
DIST_FILES = ['favicon.ico', 'robots.txt', 'sitemap.xml', '404.html']
DIST_DIRS = ['assets']
DIST_RENAME = [('redirects/_redirects-extensionless', '_redirects')]

# Source and tooling. Never published - _pages/*.body.html alone would put 25
# near-duplicates of the site on the web.
NEVER_PUBLISH = ['_pages', '_parts', 'redirects', 'integration', 'preview',
                 'build.py', 'package.py', 'qa-check.py', 'README.md']

LINK = re.compile(r'(href=")([a-z0-9-]+)\.html(#[a-z0-9-]+)?(")')


def to_extensionless(html):
    """about.html -> /about ; index.html -> / ; keeps any #fragment."""
    def sub(m):
        _o, page, frag, _c = m.groups()
        path = '/' if page == 'index' else '/' + page
        return 'href="' + path + (frag or '') + '"'
    return LINK.sub(sub, html)


def main():
    head = open(P('_parts', 'head.html')).read()
    header = open(P('_parts', 'header.html')).read()
    footer = open(P('_parts', 'footer.html')).read()

    # Cloudflare's builder always starts from a clean checkout, so dist/ there is
    # never stale. Locally the connected-folder mount refuses deletes, so fall
    # back to overwriting in place rather than failing the build.
    if os.path.isdir(DIST):
        try:
            shutil.rmtree(DIST)
        except (PermissionError, OSError):
            pass
    os.makedirs(DIST, exist_ok=True)

    built = 0
    for src in sorted(glob.glob(P('_pages', '*.body.html'))):
        name = os.path.basename(src).replace('.body.html', '')
        body = open(src).read()
        title = (re.search(r'<!--TITLE:(.*?)-->', body) or [None, 'RacFit'])[1].strip()
        desc = (re.search(r'<!--DESC:(.*?)-->', body, re.S) or [None, ''])[1].strip()
        og = (re.search(r'<!--OG:(.*?)-->', body)
              or [None, 'racfit-tennis-pickleball-fitness-club-buda-tx.jpg'])[1].strip()
        body = re.sub(r'<!--(TITLE|DESC|OG):.*?-->\s*', '', body, flags=re.S)

        def assemble(slug):
            page = (head.replace('{{TITLE}}', title).replace('{{DESC}}', desc)
                        .replace('{{HOST}}', HOST).replace('{{SLUG}}', slug)
                        .replace('{{OG}}', og)
                    + header + body + footer)
            # Turnstile's site key is public, so it is safe in the HTML - but it
            # is per-environment, so it comes from the build env rather than the
            # repo. Unset locally means no widget, which is what you want for a
            # file:// preview.
            return page.replace('{{TURNSTILE_SITEKEY}}', TURNSTILE_SITEKEY)

        # local preview copy
        open(P(name + '.html'), 'w').write(
            assemble('' if name == 'index' else name + '.html'))
        # deployed copy
        open(os.path.join(DIST, name + '.html'), 'w').write(
            to_extensionless(assemble('' if name == 'index' else name)))
        built += 1

    for f in DIST_FILES:
        if os.path.exists(P(f)):
            shutil.copy2(P(f), os.path.join(DIST, f))
    for d in DIST_DIRS:
        if os.path.isdir(P(d)):
            shutil.copytree(P(d), os.path.join(DIST, d), dirs_exist_ok=True)
    for src, dst in DIST_RENAME:
        if os.path.exists(P(src)):
            shutil.copy2(P(src), os.path.join(DIST, dst))

    files = sum(len(f) for _b, _d, f in os.walk(DIST))
    print('%d pages -> site root (.html links, for local preview)' % built)
    print('%d pages -> dist/client/ (extensionless, %d files total, served by Cloudflare)'
          % (built, files))
    leaked = [n for n in NEVER_PUBLISH if os.path.exists(os.path.join(DIST, n))]
    if leaked:
        raise SystemExit('source leaked into dist/client/: %s' % leaked)
    print('dist/client/ carries no source or tooling')


if __name__ == '__main__':
    main()
