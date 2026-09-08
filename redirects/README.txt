RacFit 301 redirect map
=======================
Built 3 Sep 2026 from https://www.goracfit.com/sitemaps.xml
Re-verified 4 Sep 2026 against the current build: 72 redirect rows, every target
page and #anchor confirmed to exist. Nothing in the map is broken.

73 live URLs: 48 pages + 20 posts + 5 category archives.

FILES
  redirect-map.csv           the source of truth. Edit this, then re-run the
                             generator - never hand-edit the server files.
  build-redirects.py         regenerates all four server files from the CSV and
                             re-checks every target against the built site.
                             Run from this folder:  python3 build-redirects.py ..
                             Exits non-zero if a target page or anchor is gone,
                             so a stale row cannot ship quietly.
  _redirects                 Netlify / Cloudflare Pages - drop in the site root
  _redirects-extensionless   same map, .html stripped - see REDIRECT CHAINS
  htaccess-snippet.txt       Apache - paste ABOVE any existing rewrite rules
  nginx-snippet.conf         nginx - paste inside the server block

WHAT CHANGED 4 SEP
  1. The root row was wrong. It sent / to /index.html, which would have exposed
     /index.html as the live home page URL and put a redirect hop on the most
     linked page on the site. It is now recorded as "no redirect" - the home page
     already serves at /. The server files never carried that rule, so nothing
     was ever going to break; the sheet just disagreed with them.
  2. Added 10 WordPress platform paths that were never in the sitemap and so were
     never in the map: /feed/, per-page feeds, /category/, /tag/, /author/,
     date archives, /wp-admin, /wp-login.php, /wp-json, /xmlrpc.php, plus the
     ugly-permalink query form (/?p=123) in the Apache snippet. WordPress
     published all of these. Left unmapped, every one is a 404 after launch, and
     the feed and archive URLs in particular collect real inbound links.
  3. All four server files are now generated from the CSV by one script. They had
     been maintained in parallel, which is how four copies of a map drift apart.

REDIRECT CHAINS - decide this before you deploy
  Every target in the map ends in .html. Netlify and Cloudflare Pages, by default,
  also serve /about for about.html and 301 the .html form to the clean one. On
  those hosts the map produces two hops:
        /about/  ->  /about.html  ->  /about
  Two hops is not fatal but it is slower, and Google only reliably follows a
  short chain. Pick one:
    a) Use _redirects-extensionless instead, and update the canonical tags in
       _parts/head.html and the URLs in sitemap.xml to the extensionless form.
    b) Keep .html as canonical and turn off the host's pretty-URL rewrite.
  Apache and nginx serving these files directly have no such behaviour - the
  standard .html files are fine there as-is.

STILL NEEDS A DECISION
  1. 25 of the 72 rows are marked "confirm" - the URL has no equivalent on the
     new site, so the target is a best guess, not a mapping. Most are the partner
     and community-rate pages (Harvest Meadows, The Aidan, The Strand, The
     Bradford, Valor x2, Santa Cruz Catholic, The Learning Experience) and the
     Heroes Rate pages. They currently rank and take traffic; sending them all to
     a generic membership page loses whatever intent they carry. Either rebuild
     them or decide where each should land.
  2. The 20 blog posts and /news-resources/ have no home on the new site. Three
     options: keep the WordPress blog on a subdirectory or subdomain, build a
     news section, or accept the loss and 301 them as mapped here.
  3. Four pages on the new site have no legacy URL pointing at them at all:
     cantina.html, events.html, food-trucks.html, pro-shop.html. That is expected
     for new content - they are in sitemap.xml and need no redirect - but they
     start with no inherited authority, so they are the pages to link to
     internally and to promote first.

BEFORE YOU DEPLOY
  The .htaccess snippet also forces the www host. If the apex is chosen as
  canonical instead, flip that first rule and update the canonical tags in
  _parts/head.html to match.

AFTER YOU DEPLOY
  Crawl every old URL and confirm each returns a single 301 hop to a 200 - no
  chains, no redirect to a redirect. Then watch Search Console's Pages report for
  two weeks.
