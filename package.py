#!/usr/bin/env python3
"""Package the site two ways.

  python3 package.py

  racfit-site-full.zip     the whole working folder - source templates, the
                           build script, the redirect map, the integration
                           notes. This is the handoff/backup copy.
  racfit-site-deploy.zip   only the files that should be publicly served.

Why two: the working folder holds things that must not go on a web server.
_pages/*.body.html is the body of every page as a standalone file - deploy it
and the site publishes 25 near-duplicates of itself. redirects/README.txt and
integration/racfit-ai-widget.md are internal notes. build.py and qa-check.py
are source. None of it is linked, but "not linked" is not "not public" - a
static host serves any path that exists.

robots.txt cannot fix this. A Disallow line is a public list of the paths you
did not want found, and it does not stop anyone fetching them anyway. Not
uploading the files is the fix.
"""
import os, shutil, zipfile, sys

ROOT = os.path.dirname(os.path.abspath(__file__)) or '.'

# Everything a browser or crawler should be able to reach.
DEPLOY_FILES = ['favicon.ico', 'robots.txt', 'sitemap.xml']
DEPLOY_DIRS  = ['assets']
# Host config: consumed by Netlify / Cloudflare Pages at the site root, not served.
HOST_CONFIG  = [('redirects/_redirects', '_redirects')]

# Never deployed. Source, tooling and internal notes.
EXCLUDE_DIRS = {'_pages', '_parts', 'redirects', 'integration', 'preview',
                '_qafonts', '_idcheck', '__pycache__'}
EXCLUDE_FILES = {'build.py', 'qa-check.py', 'package.py', 'README.md',
                 'site-mirror.tar.gz'}


def zip_full(out):
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for base, dirs, files in os.walk(ROOT):
            dirs[:] = [d for d in dirs
                       if not d.startswith('racfit-site-full') and d != '__pycache__']
            for f in files:
                if f.endswith('.zip') or f == '.DS_Store':
                    continue
                p = os.path.join(base, f)
                z.write(p, os.path.relpath(p, ROOT))
    return out


def zip_deploy(out):
    manifest = []
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(os.listdir(ROOT)):
            if f.endswith('.html') and os.path.isfile(os.path.join(ROOT, f)):
                z.write(os.path.join(ROOT, f), f); manifest.append(f)
        for f in DEPLOY_FILES:
            if os.path.exists(os.path.join(ROOT, f)):
                z.write(os.path.join(ROOT, f), f); manifest.append(f)
        for d in DEPLOY_DIRS:
            for base, dirs, files in os.walk(os.path.join(ROOT, d)):
                dirs[:] = [x for x in dirs if x not in EXCLUDE_DIRS]
                for f in files:
                    if f == '.DS_Store':
                        continue
                    p = os.path.join(base, f)
                    rel = os.path.relpath(p, ROOT)
                    z.write(p, rel); manifest.append(rel)
        for src, dst in HOST_CONFIG:
            if os.path.exists(os.path.join(ROOT, src)):
                z.write(os.path.join(ROOT, src), dst); manifest.append(dst + '   (host config)')
    return out, manifest


if __name__ == '__main__':
    full = zip_full(os.path.join(ROOT, 'racfit-site-full.zip'))
    dep, man = zip_deploy(os.path.join(ROOT, 'racfit-site-deploy.zip'))
    html = len([m for m in man if m.endswith('.html')])
    print('racfit-site-full.zip     %6.1f MB  (working copy - do not deploy)'
          % (os.path.getsize(full) / 1e6))
    print('racfit-site-deploy.zip   %6.1f MB  %d pages, %d files'
          % (os.path.getsize(dep) / 1e6, html, len(man)))
    print()
    print('excluded from the deploy zip:')
    for d in sorted(EXCLUDE_DIRS):
        if os.path.isdir(os.path.join(ROOT, d)):
            n = sum(len(f) for _b, _d, f in os.walk(os.path.join(ROOT, d)))
            print('  %-14s %d files' % (d + '/', n))
    for f in sorted(EXCLUDE_FILES):
        if os.path.exists(os.path.join(ROOT, f)):
            print('  %s' % f)
