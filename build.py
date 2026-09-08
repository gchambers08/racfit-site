#!/usr/bin/env python3
"""RacFit static site assembler.

Builds the site twice, from one source, into two forms:

  <root>/*.html   .html filenames and .html internal links.
                  Double-click any of these in Finder and the site works
                  offline, exactly as it always has.

  dist/           extensionless internal links and canonicals, plus assets,
                  robots.txt, sitemap.xml, 404.html and _redirects.
                  THIS is what Cloudflare Pages publishes.

Why two. Cloudflare Pages strips .html and 308-redirects /about.html to
/about, and that is not configurable. So on Pages, .html cannot be the
canonical form - every internal .html link would cost a redirect hop on
every click, and the canonical tags would point at URLs that redirect.
dist/ is therefore extensionless throughout. Generating it rather than
converting the source keeps local preview working the way Grant reviews.

Each body file starts with:
  <!--TITLE: ... -->
  <!--DESC: ... -->
  <!--OG: filename-in-assets-img.jpg -->   (optional)

Run:  python3 build.py
"""
import os, re, glob, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
P = lambda *a: os.path.join(ROOT, *a)
DIST = P('dist')

# Canonical host. Apex, not www - the redirect config sends www here.
# Change this, the host rule in redirects/redirect-map.csv and sitemap.xml
# together; all three have to agree.
HOST = 'https://goracfit.com'

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
            return (head.replace('{{TITLE}}', title).replace('{{DESC}}', desc)
                        .replace('{{HOST}}', HOST).replace('{{SLUG}}', slug)
                        .replace('{{OG}}', og)
                    + header + body + footer)

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
    print('%d pages -> dist/ (extensionless, %d files total, for Cloudflare Pages)'
          % (built, files))
    leaked = [n for n in NEVER_PUBLISH if os.path.exists(os.path.join(DIST, n))]
    if leaked:
        raise SystemExit('source leaked into dist/: %s' % leaked)
    print('dist/ carries no source or tooling')


if __name__ == '__main__':
    main()
