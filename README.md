# RacFit — Website Redesign

A static site. No build tools, no dependencies, no database. Open `index.html`
in a browser to view it, or upload the whole folder to any host.

## Design

All colors live as CSS custom properties at the top of `assets/css/racfit.css`.

| Token | Value | Use |
|---|---|---|
| `--brand` | `#295DA8` | **Foundation** — body background, default sections |
| `--brand-deep` | `#102748` | Header, footer, alternating "deep" sections |
| `--brand-surface` | `#1B4380` | Recessed surfaces — cards, split panels |
| `--brand-mid` | `#1E4A89` | Hover states, eyebrows on light backgrounds |
| `--ink` | `#102748` | Text on light backgrounds |
| `--optic` | `#D9F53C` | Accent — CTAs, eyebrows, stats, marquee |
| `--optic-2` | `#C2DE2A` | Checkmarks and rules on light backgrounds |
| `--paper` | `#F4F4EF` | Light sections |

The optic yellow is sampled directly from the USTA Back To School Bash flyer;
the blue is RacFit brand blue `#295DA8`.

Two muted text tokens are tuned to clear WCAG AA (4.5:1) against these
backgrounds, so change them together with the blues if you re-theme:
`--muted` is `rgba(255,255,255,.80)` on blue, `--muted-dk` is
`rgba(16,39,72,.72)` on paper/white.

### Reverting to the original navy

The palette change is four token values plus the alpha tuning above. To go back:

| Token | Blue (current) | Navy (original) |
|---|---|---|
| `--brand` | `#295DA8` | `#04203E` |
| `--brand-deep` | `#102748` | `#021428` |
| `--brand-surface` | `#1B4380` | `#0A2E52` |
| `--brand-mid` | `#1E4A89` | `#13446F` |

Navy is much darker, so the muted alphas can drop back toward `.72` / `.62`
without failing contrast. Also swap `assets/logos/racfit-blue.png` (used in the
JSON-LD logo field and the light-background wordmark) and re-generate
`assets/apple-touch-icon.png` / `assets/icon-512.png`, which are the wordmark on
a solid `--brand` tile, and update `theme-color` in `_parts/head.html`.

Type: **Anton** (display, uppercase) + **Barlow** / **Barlow Condensed** (body and
UI), loaded from Google Fonts with system fallbacks.

## Pages

| File | Contents |
|---|---|
| `index.html` | Rotating hero, three programming pillars, Courtside Cantina, food trucks, membership, facility, events |
| `tennis.html` | **Chooser** — sends visitors to Adult or Junior, and holds the shared coaching section (`#coaches`) |
| `adult-tennis.html` | Adult clinics, Tennis 101, private lessons, open play, indoor courts |
| `junior-tennis.html` | Red/Orange/Green through High Performance, the Fall 2026 pathway chart (`#pathway`) and level schedules (`#levels`) |
| `pickleball.html` | Adult programs, covered courts, private lessons, membership CTA |
| `fitness.html` | Class schedule, Les Mills partnership, fitness team |
| `pro-shop.html` | Pro shop, stringing labor + string price table, brand wall, accessories |
| `juniors.html` | Kids hub — summer camp + pricing + FAQ, Digital Sports, ActiveCare. Junior *tennis* lives on `junior-tennis.html`; this page links to it rather than repeating it |
| `membership.html` | Individual / Pickleball / Fitness / Couples / Family tiers + FAQ |
| `corporate-memberships.html` | From the corporate flyer — 30% off, $0 initiation, benefits, events |
| `cantina.html` | Courtside Cantina, links out to CourtsideCantina.com |
| `food-trucks.html` | Yachties, Bahama Buck's, Three Birds Coffee |
| `events.html` | Events hub - one card per event type, links to the three pages below |
| `corporate-events.html` | Corporate events and team building, with an enquiry form |
| `birthday-parties.html` | Kids birthday parties and the two packages |
| `socials.html` | Member socials, leagues, tournaments and club championships |
| `about.html` | Mission, story, facility, team, foundation, careers, contact |
| `careers.html` | Listing page — summary card per open role, links to the full description |
| `careers-director-of-pickleball.html` | Full job description |
| `careers-customer-experience-associate.html` | Full job description |
| `tour.html` | Request-a-tour form, what to expect, hours and directions |

## How to edit

Pages are assembled from shared parts so the nav and footer only exist once.

```
_parts/head.html      <head> + opening <body>   ({{TITLE}}, {{DESC}} placeholders)
_parts/header.html    sticky header + mobile nav
_parts/footer.html    footer + script tag
_pages/*.body.html    the unique content of each page
build.py              assembles them into the .html files at the root
```

Edit a file in `_pages/`, then run:

```
python3 build.py
```

To change the nav or footer everywhere, edit `_parts/` and rebuild.
The root `.html` files are generated — don't edit them directly, they get
overwritten on the next build.

## The junior pathway PDF

`assets/docs/RacFit-Junior-Tennis-Pathway-Fall-2026.pdf` — the Fall 2026 program
details sheet. It appears in two places, both with an inline preview image
(`assets/img/junior-pathway.jpg`), a **Download the PDF** button and a
**View in Browser** link:

- `tennis.html#pathway` — between the junior intro and the level-by-level
  accordion, so it sits exactly where a parent is deciding.
- `juniors.html#pathway` — its own section on the youth hub, above Summer Camp.

To swap in a newer edition: replace the PDF at the same path, re-render a preview
(`pdftoppm -png -r 200`, resize to ~1250px wide, save as
`assets/img/junior-pathway.jpg`), and update the level chips in
`_pages/tennis.body.html` / `_pages/juniors.body.html` if the levels changed.

## SEO

Every page carries a unique title (36-62 chars) and description (~200 chars) written
around what people actually search locally - "pickleball courts Buda", "tennis
lessons Kyle TX", "corporate event venue Buda", "kids birthday party Buda" - with
Buda, Kyle, San Marcos and South Austin named naturally rather than stuffed.

Also in place:

- **Canonical URLs** and `og:` / `twitter:` tags per page, each with its own
  relevant OG image.
- **JSON-LD** `SportsActivityLocation` in `_parts/head.html`: address, phone,
  email, opening hours, sports, amenity list, `areaServed` for Buda / Kyle /
  San Marcos / Austin, and a `ReserveAction` pointing at the booking system.
- **Image filenames** renamed to describe the subject and place, e.g.
  `covered-pickleball-courts-buda-tx.jpg`, `junior-tennis-lessons-buda-tx.jpg`.
- **Alt text** on all 98 images - descriptive of what's in the shot, not keyword lists.
- **`width` / `height` on every image**, so the browser reserves the right space and
  the page doesn't jump while loading (helps Core Web Vitals).
- **`sitemap.xml`** (15 URLs) and **`robots.txt`**.

Two things to set before or just after launch:

1. **Confirm the canonical domain.** Everything is written as
   `https://www.goracfit.com/`. If the site should live at the apex
   (`goracfit.com`, no www), search-and-replace that in `_parts/head.html`,
   `sitemap.xml` and `robots.txt`, and make sure the host 301-redirects the other
   version to it. Right now the live site answers on both, which splits ranking
   signal.
2. **Add latitude and longitude** to the JSON-LD `geo` property, and claim /
   update the Google Business Profile with the same name, address and phone as the
   structured data. I left `geo` out rather than guess coordinates for the exact
   address.

## Assets

- `assets/img/` — 30 photos, resized and compressed for web (whole site is ~10MB,
  down from ~230MB of originals). Sources are the JPEGs in the parent folder.
- `assets/logos/` — food truck logos, plus the RacFit wordmark extracted from the
  corporate flyer PDF as transparent PNGs (white / brand blue / optic yellow).
- `assets/css/racfit.css` — the whole design system, one file.
- `assets/js/racfit.js` — sticky header, mobile nav, scroll reveal, accordions, marquee.

## Tennis page structure

`/tennis/` is deliberately a short chooser page, not a content page. It keeps the
URL (and whatever search equity it has) while sending visitors to the page that
actually applies to them:

```
tennis.html          chooser + shared coaching section (#coaches)
  |- adult-tennis.html
  |- junior-tennis.html
```

Two consequences worth remembering when editing:

- **Coaches live on `tennis.html#coaches` only.** Both sub-pages link to it
  instead of repeating the roster, so a coaching change is a one-file edit.
- **The Fall 2026 pathway chart lives on `junior-tennis.html#pathway` only.** It
  used to appear on both the tennis page and `juniors.html`, which meant updating
  it twice every season and splitting its SEO value. `juniors.html` now links to
  it. Keep it that way.

The nav skips the chooser and links straight to Adult Tennis and Junior Tennis -
the chooser is for people who arrive at `/tennis/` from search or an old link.

## Pro shop pricing

Prices on `pro-shop.html` come from the club's own POS export (Sep 2026) and are
**labor and string quoted separately**, which is how the desk sells it:

- Stringing labor **$30.00**, grommet replacement **$10.00**
- String sets **$5.00-$22.00**, listed per half set and per full set

Three deliberate decisions, so nobody "fixes" them later:

1. **No stock levels and no out-of-stock items.** The source export carries
   per-SKU stock counts and roughly 40 items sit at zero. The page shows brands
   and lines, not a live catalogue - it must not become something the front desk
   has to reconcile by hand.
2. **The 200 m RPM Blast reel is excluded.** The export lists it at $279.00
   labelled "Full Racket", which would read as a $279 restring. It is a bulk reel,
   not a stringing option.
3. **Brand logos live in `assets/logos/brand-*.png`.** Supplied as
   white-background files at very different aspect ratios, so each sits in a fixed
   104px white `.brand-tile` with `object-fit:contain` - that is what keeps a row
   of mismatched logos looking even. The RacFit paddle tile is the one exception:
   blue tile, white wordmark (`racfit-white.png`, *not* `racfit-blue.png`, which
   is invisible on blue).

When prices change, edit the `.ptable` rows in `_pages/pro-shop.body.html` and the
two figures in the `#stringing` cards. There is no data file - the table is hand
written on purpose, so a stale POS export can never silently republish itself.

## Outbound links

`https://book.goracfit.com` (Book a Court / registration), `https://courtsidecantina.com`,
`https://bahamabucks.com`, `https://www.racfitfoundation.org`.

## Booking links

The tennis page deep-links into the booking system by category:

| Link | Target |
|---|---|
| Adult "View Classes" | `category=Adults [Tennis]` |
| Open Play | `category=Adults [Tennis]&search=open` |
| Red Ball (both age groups) | `category=Juniors [Tennis - Red]` |
| Orange Ball | `category=Juniors [Tennis - Orange]` |
| Green Ball | `category=Juniors [Tennis - Green]` |
| High Performance | Email the High Performance Director (placement is by approval) |
| All membership CTAs | `book.goracfit.com/f/goracfit/memberships` |

Header, footer and generic "Book a Court" buttons point at `book.goracfit.com`.

## Membership is optional

The site says so in four places, deliberately and without undercutting the join
CTA: the homepage hero meta, a band under the homepage marquee, a band on the
tennis page ("Anyone can book a court"), and twice on the membership page.

## Still to fill in

1. **Food truck menus.** Yachties' menu is a download at
   `assets/docs/Yachties-Express-Menu.pdf`. Bahama Buck's and Three Birds still have
   none. Hours are now published - a "Who's Open When" summary near
   the top of `food-trucks.html` plus an hours block on each vendor. Menus are still
   missing; drop menu highlights into `_pages/food-trucks.body.html` when you have
   them. Current hours:
   Three Birds 7:00 AM - 2:00 PM daily except Monday; Yachties 5:00 PM - 10:00 PM
   daily except Tuesday; Bahama Buck's Fri 1:00-6:00 PM, Sat & Sun 1:00-7:00 PM.

   Each vendor shows two square photos side by side - a product shot and the truck
   on site - via `.vendor-gallery` in the CSS. Yachties' product tile is a rotator
   cycling five menu photos with a photo counter and clickable dots.

   **Rotating photo sets** use one shared component. Put `data-rotate="<ms>"` on a
   container whose direct children are `.slide` divs; add an empty
   `<div class="rotator-dots"></div>` for clickable dots and a
   `<span class="rotator-count">1 of N</span>` for the counter, both optional. The
   homepage hero and the Yachties tile both run on it, so adding a photo anywhere
   is a matter of adding one more `.slide` - no JS changes. Hovering pauses it. The
   food-trucks hero runs on it too, cycling seven photos across the vendors. That
   hero carries a `hero-open` class: a taller frame plus almost no Ken Burns
   magnification, which shows about 22% more of each photo than a standard hero
   crop. `.hero-open`'s min-height has to exceed the hero's content height or it
   does nothing - the content is what normally sets that height.

   **No hero-quality Bahama Buck's photo.** Their only shot is 560x560, which is fine
   in a small square tile but too small for the hero, so the hero mixes Yachties and
   Three Birds photography plus the all-three-trucks shot. A larger Bahama image
   would let it join the rotation. The homepage food-truck cards
   use the product photos rather than flat logos, since appetizing photography
   converts better there; the logos still identify each brand on the food-trucks
   page. To go back to logos on the homepage, swap `.ph.square` back to `.ph.logo`
   with the `assets/logos/*.png` file in `_pages/index.body.html`.
2. **Yachties website — resolved.** `yachtiesbtx.com` went live 2 Sep 2026 and is
   linked from `food-trucks.html#yachties`. Verified: it is Yachties at RacFit,
   1390 Robert S. Light Blvd, with hours matching this site (5–10 PM, closed
   Tuesdays).

   Two things to watch. **Do not link `yachtiesatx.com`** — the *A*TX domain
   redirects to a gambling/phishing page and appears hijacked. Only the *B*TX
   domain is theirs. And their live site now carries a priced menu, so the
   `Yachties-Express-Menu.pdf` download on the food-trucks page is a second source
   of truth that will drift; consider making the website the primary button and
   dropping the PDF once they are confident in the site. Their site also lists
   catering for 20–100 guests, which `corporate-events.html` does not mention.
3. **Level photos - two of five done.** The junior-tennis level cards are built on
   `.card-media`, so a card with no `<div class="ph">` still renders correctly.
   Red Ball 5-6 and Red Ball 7-9 have real photos; **Orange Ball, Green Ball and
   High Performance still need one each.** Because the grid is 2-up, the two photo
   cards occupy row one and the two without occupy row two, so the gap reads as
   deliberate rather than broken - but three more photos drop straight in. To add
   one, make this the first child of the card, before `<div class="bd">`:

   ```html
   <div class="ph"><img src="assets/img/<file>.jpg" alt="..." loading="lazy" width="W" height="H"></div>
   ```

   The `.ph` box is 4:3 with `object-fit:cover`, so any landscape crop works.

4. **Live schedules.** "View Classes" buttons point at book.goracfit.com. Swap for
   deep links if the booking system supports them.
5. **Team photos.** The team grid is text-only; headshots would lift `about.html`.
6. **Reconcile the level list with the PDF.** The accordion on `junior-tennis.html` came
   from the old site and no longer matches the Fall 2026 chart. The PDF has three
   levels the accordion doesn't (Beginner Teen Pathway 10–14, HS Training JV & MS,
   HS Training Varsity); the accordion has High Performance, which isn't on the
   PDF; and Green Ball is 7–12 on the chart but 8–12 on the page. The accordion
   also carries class times and registration links the PDF doesn't, so the two
   want merging rather than replacing. Worth a decision before launch.
7. **Junior photography — partly resolved.** `junior-tennis-red-ball-buda-tx.jpg`
   is real club photography and now carries the junior-tennis hero, the homepage
   hero rotation and the Junior Tennis tile on `tennis.html`. The older
   `junior-tennis-lessons-buda-tx.jpg` is AI-generated and its shirt reads RacFit
   Foundation; it still appears on `junior-tennis.html`, `about.html`,
   `birthday-parties.html` and `juniors.html`. Replace those four with real photos
   when available. Note the red-ball shot is 1536px wide against 2000px for the
   other heroes, so it softens slightly on large displays — a full-resolution
   original would be a straight swap.
8. **The family membership cap is gone.** "Up to four members" is now "your whole
   family - unlimited members" everywhere, and the FAQ about adding a member was
   rewritten to match. **I removed the old "$49/month per additional immediate
   family member" line** because it directly contradicted unlimited members - if
   that fee still applies in some cases (extended family, adult children), tell me
   and I'll put it back with the right wording. The separate $49/month ActiveCare
   add-on is untouched.
8. **Set up Google Search Console** and submit `sitemap.xml` once the site is live.
9. **Wire up the enquiry forms.** `tour.html` has a real, validated form. With no
   backend on a static site, submitting it composes an email in the visitor's mail
   client with every field filled in. To switch to a proper form service, give the
   `<form>` a real `action` and `method` and delete the `[data-tour-form]` block in
   `assets/js/racfit.js` — everything else stays. Contact and event enquiries
   elsewhere still use `mailto:` / `sms:` links.

## The app

Every page's footer carries an app promo above the link columns, with App Store
and Google Play buttons:

- iOS — `https://apps.apple.com/us/app/racfit/id6749549786`
- Android — `https://play.google.com/store/apps/details?id=com.court.racfit&hl=en_US`

The store marks are inline SVG in `_parts/footer.html`, drawn in white to sit on
the deep-blue footer. If you'd rather use Apple's and Google's official badge artwork,
drop the PNGs into `assets/logos/` and swap the two `<a class="store-btn">` blocks
for plain `<img>` links.

## Checked

`qa-check.py` runs six automated checks over every built page. It needs Python
with Playwright (`pip install playwright && playwright install chromium`), then:

```
python3 qa-check.py .
```

It exits 0 only when everything passes, and reports:

1. **HTML well-formedness** - tag balance, unclosed and stray tags
2. **Links and assets** - broken internal links, missing `#anchor` targets, missing local files
3. **Horizontal overflow** - 11 viewport widths from 320 to 1920px (elements an ancestor clips are ignored)
4. **Image distortion** - rendered aspect ratio vs the file's intrinsic ratio, for images not using `object-fit`
5. **Text contrast** - every text node measured against its actually painted background, WCAG AA (4.5:1 normal / 3:1 large)
6. **Display-heading word breaks** - any single word wider than its column at mobile widths

It disables transitions and forces the scroll-reveal end state before measuring,
so animation mid-states don't register as failures.

Current status: **21 pages, 0 issues** across all six checks.

Also verified by hand: the hero slideshow cycles with exactly one slide visible at
a time; the tour and corporate-event forms behave for both the empty and the
filled case; store links match the URLs above.

---

## Icons and share images (added 3 Sep 2026)

`head.html` previously linked two icon files that did not exist. Full set now built
from the `R` glyph cropped out of `racfit-white.png` — a wordmark crammed into a
32px square is an unreadable smear, the single letter is legible at 16px.

| File | Size | Use |
|---|---|---|
| `favicon.ico` | 16/32/48/64 | legacy + tab icon |
| `assets/favicon-{16,32,48}.png` | as named | modern tab icon |
| `assets/apple-touch-icon.png` | 180 | iOS home screen (full-bleed, no alpha) |
| `assets/icon-{192,512}.png` | as named | PWA, `purpose: any maskable`, 28% padding so a circular mask never clips the R |
| `assets/site.webmanifest` | — | name, theme colour `#295DA8`, background `#102748` |

**Share images.** `og:image` now points at `assets/og/<name>.jpg`, not
`assets/img/`. Every one of the 15 distinct OG photos has a 1200×630 derivative
in `assets/og/` with a navy bottom scrim and a small white wordmark, so a shared
link never renders a random centre-crop of a 3:2 photo. `og:image:width`/`height`
are declared, which lets Facebook and LinkedIn render the card on first paste.

`assets/img/racfit-share-buda-tx.jpg` is the master card (aerial + wordmark +
"TENNIS · PICKLEBALL · FITNESS · SOCIAL"); it is what `assets/og/racfit-tennis-pickleball-fitness-club-buda-tx.jpg`
contains, so the homepage and corporate-memberships share it. Contrast of every
text block was measured against the worst-case (lightest) pixel of the composited
background beneath it — wordmark 5.6:1, everything else above 7:1.

To regenerate after a photo swap: rebuild the derivative for that filename only.
The scrim is a vertical ramp × left wash combined as `1-(1-v)(1-l)`, tuned to keep
the top-right ~90% unfiltered.

## Policy pages

`privacy-policy.html`, `terms-conditions.html`, `cancellation-policy.html`, carried
over **word for word** from the live site (read via the browser, not summarised).
Linked from a new `.ftr-legal` row in the footer bar. Long-form copy uses the new
`.prose` component: 74ch measure, `h2` with a top rule, `.callout` for the summary
block on the cancellation page, `.prose-date` for the effective date.

**Do not publish `terms-conditions.html` as-is.** Three things carried over that
need a decision, marked with an `ACTION REQUIRED` comment in
`_pages/terms-conditions.body.html`:

1. The SMS Marketing section publishes `[Your Company Name]`,
   `[support email or phone number]` and `[Privacy Policy link]` unfilled.
2. The owner is **RACFIT OPERATIONS LLC** but the liability waiver and the IP
   clause both name **RACFIT INVESTMENTS LLC**. A waiver naming the wrong entity
   may not protect the operating company — counsel should confirm.
3. Governing law is Travis County; the club is in Hays County. May be deliberate.

## `.no-balance`

The site-wide `text-wrap: balance`/`pretty` rules stay everywhere (they took the
orphan count from 128 to 6). `.no-balance` on a container restores plain greedy
wrapping for a block whose original line breaks were the wanted ones. Currently
used only on the homepage Courtside Cantina section (`#cantina`).

## Metadata limits

Enforced 3 Sep 2026 across all 25 pages: `<title>` ≤ 60 chars, `<meta description>`
110–158 chars. Every description was previously 178–313 and would have been
truncated in results. The build copies DESC into `og:description` and
`twitter:description`, so all three stay in sync automatically — keep new pages
inside those limits.

## Launch blockers (not code)

1. **Redirect map.** Old site serves `/our-team/`, `/privacy-policy/`, `/contact/`;
   the rebuild serves `.html`. Needs either host config to serve the new pages at
   the old directory paths, or a 301 per old URL. Requires the full live URL list.
2. **`www` vs apex.** Canonicals say `https://www.goracfit.com/`; the live site
   answers on the apex. Pick one, 301 the other, then realign canonicals + sitemap.
3. **Email.** Footer and JSON-LD use `contact@goracfit.com`; contact form,
   cancellation policy and Terms use `info@goracfit.com`. Pick one.
4. **Analytics.** None installed anywhere, yet the privacy policy states
   "We use Google Analytics." Either add GA4 or remove the claim.
5. The Terms items above.

## Staff photos and bios — outstanding

`racfit bios.docx` supplies bios + titles for 14 people. 12 headshots supplied,
**unlabeled** — mapping is with Grant (lettered key A–L sent 3 Sep). 11 share the
same blue-grey studio background; ref `I` is on black and needs replacing.

Titles from the doc that **disagree with the About grid**: Cherie Simpson and
Michael Carson are *Personal Trainer* in the doc, *Fitness Instructor* in the grid;
Michael MacVay is *Director of Youth Racquet Sports* in the doc, *Director of Youth
Tennis* in the grid; Carin is *Carin Randle White* in the doc, *Carin White* in the
grid. Not resolved unilaterally.

Still no bio and no title anywhere for: **Alma Gormley**, **Cooper Ross**,
**TaiShana** (last name unknown), **Kyle Huls**, **Braxton Birkenmayer**,
**Carlos Zapata Diez**. And still no pickleball staff listed anywhere on the site
since Minh Vu and Kaitlyn Ferrara were removed.

## Staff photos and bios — DONE (3 Sep 2026)

The 12 headshots sent through chat arrive as hashed filenames, so the names were
recovered by matching md5 against the originals in `~/Downloads`. All 12 matched
exactly. Four more staff photos were found in the same folder, giving 16 total.

Sources → `assets/img/staff/<slug>.jpg`, all normalised to **720×900 (4:5)**:
subject segmented against the studio backdrop (per-row background model, not
face detection — Haar misfired on Plotkin and Hernandez), then cropped so head
width is a constant 25.5% of frame with 10.5% headroom. Michael Carson's was shot
on black; his subject was keyed and composited onto the same studio gradient
averaged from the other 15, so the set is visually consistent.

Regenerate with the script pattern in the session notes — the inputs are the
originals in `~/Downloads`, not the files in `assets/img/staff/`.

**Cards.** New `.staff` component: photo, name, role, and the full bio behind a
native `<details>` ("View Bio") — no JS, keyboard accessible. `.staff` uses
`align-items:start` so an opened bio grows only its own card instead of
stretching every sibling in the row. `.staff-5` is the 5-up variant used for the
two five-person grids on About so no card sits alone in a row. `.staff-lead`
carries the short hand-written intro on the fitness page above the full bio.

Placed on: `about.html#team` (17 cards — Brad Harris and Michael MacVay appear in
both leadership and Managing Partners), `tennis.html#coaches` (6),
`fitness.html` (4). `.person` is fully retired.

### Titles now taken from racfit bios.docx
Grant confirmed the document is authoritative. Changed from what the grid had:

| Person | Was | Now |
|---|---|---|
| Michael MacVay | Director of Youth Tennis | Director of Youth Racquet Sports |
| Cherie Simpson | Fitness Instructor | Personal Trainer |
| Michael Carson | Fitness Instructor | Personal Trainer |

Two typos in the source document were corrected, not carried over: Brad Harris's
title read "Director of Adule Racquet Sports".

### Still open
- **Cooper Doss** — photo processed and ready but *not placed*: no title, no bio,
  and no discipline. Note the earlier staff list called him "Cooper **Ross**";
  the photo file says "Cooper **Doss**". Needs confirming.
- ~~No bio for Alma Gormley~~ — **supplied 3 Sep and added.** Her `View Bio`
  now carries the bio verbatim on both About and Fitness. On Fitness her
  `.staff-lead` was trimmed to a one-liner, because the previous lead was
  effectively the whole bio and would have duplicated the panel below it.
  Every staff card on the site now has a bio: 17 on About, 6 on Tennis, 4 on
  Fitness.
- **Nothing at all** for TaiShana (last name unknown), Kyle Huls,
  Braxton Birkenmayer, Carlos Zapata Diez. (`bb-headshot.jpg` in Downloads is a
  different person, not Braxton.)
- **No pickleball staff anywhere** — unchanged since Minh Vu and Kaitlyn Ferrara
  were removed. Their photos are still in `~/Downloads` if they come back.
- **Per-coach booking links** were lost when the session context rolled over.
  Cards have no "Book a Lesson" link yet; re-send the nine `book.goracfit.com`
  pro URLs and they go on the matching cards.
- Name spellings to confirm: doc says "Carin **Randle** White", the photo file
  says "carin-**randal**-white", the site displays "Carin White" (unchanged).
  Cherie's lead copy says 20 years / ACE Certified Fitness Professional per the
  doc; the old fitness page said 17 years / ACE Senior and Group Fitness
  Specialist.

## Tennis page tweaks (3 Sep 2026)
- Hero focal point dropped: `.hero-bg img[src$="group-tennis-clinic-buda-tx.jpg"]
  {object-position:50% 72%}`. Scoped to `.hero-bg` so the same photo in the
  homepage gallery strip is untouched.
- Junior Tennis tile now uses `junior-tennis-forehand-buda-tx.jpg` — a 1200×900
  4:3 crop of the supplied photo placing the player at 63% across, so he clears
  the copy block at every breakpoint. Verified against a simulation of the real
  `.tile` scrim at 800×600 and 520×475.
  The homepage tile and the junior-tennis hero still use
  `junior-tennis-red-ball-buda-tx.jpg` (the girl) — deliberately not swapped,
  since that filename also drives the junior-tennis hero and its tuned mobile
  `object-position`. Say the word to change those too.

### Homepage hero clearance
`.hero:not(.hero-sm){padding-top:clamp(156px,calc(13vh + 40px),192px)}` — +40px
over the shared 116/13vh/152px. The homepage H1 is the only hero H1 with no
eyebrow above it, so it sat directly under the fixed header logo (measured 37px
of clearance at 1440, 50px at 390). Now 77px and 90px. Widths around 570-768px
were already at 90-107px and are unchanged, because the hero is bottom-aligned
and had slack there. Every `.hero-sm` page keeps 117px.

## Staff photos v2 — bottom-crop bug fixed (3 Sep 2026)

The first pass let the crop window extend below the source image. Every one of
these headshots is truncated by its own source frame (subject bottom sits within
4px of the source bottom in all 16), so padding below it left the torso ending in
a hard horizontal line with background underneath — visible on Rother, MacVay
and Karla.

Fix: **padding is allowed above and to the sides, never below.** The crop bottom
is clamped to the source bottom and the window slides up if it would overrun.
Head fraction raised to 0.36 of frame width, which is the tightest head in the
set (Cherie, 0.355) — so every photo now reaches a single uniform framing with no
bottom pad at all, asserted in the script. Result: head fraction 0.360 on all 16,
headroom 10.4–11.2%, top padding only on Alma (52px), Carson (31px) and
Hernandez (4px), all of it invisible flat gradient.

## View Bio → modal

Progressive enhancement, not a rewrite. The markup still ships as
`<details>/<summary>`, which works with zero JS. On load, `racfit.js` checks for
real `<dialog>` support and — only if present — sets `.has-bio-modal` on `<html>`,
collapses the inline panel via CSS, and intercepts the summary click to show the
same content in one shared dialog. `showModal()` gives focus trapping and Esc
free; backdrop click and focus-return-to-trigger are wired explicitly.

Verified: card height 553px before and after opening (no reflow), correct
name/role/photo/paragraph count injected, Esc closes and focus returns to the
summary. With JS off it degrades to the previous inline expander.

## Homepage food trucks — height halved

Three square photos stacked above their copy made the section far taller than it
earned. New `.card-media.row` variant puts the photo beside the copy at 40/60:
the card row went from ~670px to **186px** at 1440 (photo 167×184), the lede was
cut to one line, and the button margin trimmed. Photos are still real
photographs, just landscape instead of square.

## 301 redirect map — DONE, in `redirects/`

Built from `https://www.goracfit.com/sitemaps.xml` (which is `sitemaps.xml`, not
`sitemap.xml` — the new site's own file is `sitemap.xml`). 73 live URLs:
48 pages, 20 posts, 5 category archives. All 73 mapped; every target page and
`#anchor` validated against the built site.

48 are clear. **25 are marked `confirm`** — no equivalent exists on the new site.
The bulk are the partner/community landing pages (Harvest Meadows, The Aidan,
The Strand, The Bradford, Valor Kyle + South Austin, Santa Cruz Catholic, The
Learning Experience) and the Heroes Rate pages, plus the 20 blog posts and
`/news-resources/`. Those need a content decision, not a redirect guess.

See `redirects/README.txt` for deployment order and the post-deploy check.

## Hero eyebrows removed site-wide (3 Sep 2026)

The audience-label eyebrow is gone from **all 17 heroes that had one** — "02 -
Programming", "03 - Programming", "Adult Tennis", "Pro Shop", "Ages 3 & Up",
"Legal", "About", "Membership" and the rest. `.eyebrow.aud` is now unused by any
hero; section-head eyebrows (82 of them) are untouched.

**Five heroes kept their eyebrow deliberately**, because on those pages it is a
breadcrumb back-link rather than a label:

| Page | Content |
|---|---|
| birthday-parties, corporate-events, socials | `← Events` |
| careers-director-of-pickleball | `← Careers · Full-Time` |
| careers-customer-experience-associate | `← Careers · Part-Time` |

Removing those would strip the only route back to the parent page. Say the word
if they should go too.

`pro-shop.html` H1: "Strung right here." → **"Full-Service Pro Shop"**.

## Hero clearance: 100px minimum, measured

With the eyebrows gone the H1 is the first element in every hero, so the
clearance rule is now uniform:

```css
.hero{ ... padding-top:clamp(180px,calc(13vh + 64px),210px)}
```

The header logo's bottom edge sits at 80px on desktop and 68px on mobile, so
180px is the floor that guarantees ≥100px of air. This replaced **both** the old
`clamp(116px,13vh,152px)` and the homepage-only `+40px` override added earlier
that day — 180px already exceeds it, so the special case was retired rather than
stacked on.

Verified across all 25 pages at 390 / 768 / 1440 / 1920:

| | before | after |
|---|---|---|
| Worst gap | **37px** (18 pages at 1440 and 1920) | **101px** |
| Pages under 100px | 50 page/width combinations | **0** |

The generous mobile figures (250–470px) are not padding — the hero is
bottom-aligned, so at narrow widths the content has slack and floats well below
the logo anyway. The padding floor only binds where the content is tall enough
to press against it, which is every desktop width.

## Membership hero (3 Sep 2026)
The "Your feedback shaped these plans…" lede was removed. The hero now leads
straight into the "Members play more." plea, which is the emphasis that page was
asked for in the first place.

## Split panels match the photo
`.split` was `align-items:center`, so the `.mid` panel sat at its own content
height and floated vertically inside a row sized by the photo — the section
background showed as bands above and below the dark box. Now:

```css
.split{ ... align-items:stretch ... }
.split-body{ ... display:flex;flex-direction:column;justify-content:center}
```

The panel fills the row; the copy is still centred, just by the panel rather
than the grid. Verified across all 27 side-by-side split sections at 1024 / 1440
/ 1920: panel top and bottom now match the photo to within 1px on every one
(was up to 69px short at each end). Affects the 8 `.split-body.mid` sections;
the one plain `.split-body` has no background so it looks unchanged.

## Pickleball hero button
"Paddles & Pro Shop" → **"Book a Court"**, and the href moved from
`pro-shop.html#brands` to `https://book.goracfit.com` — the old link would have
been wrong for the new label.

## Hero H1 leading — `.d1{line-height:1}`

**Anton's cap height is 0.858em**, measured from a real render: the caps fill
almost the entire em box. So for this typeface line-height is very nearly
cap-to-cap, and the usual intuition about display leading does not apply.

At the original `.86` the ink gap between lines was **exactly 0** — the caps
touched. A first pass took it to `.78` on the assumption that "minimal space"
meant tighter; that was wrong, and it **overlapped** the lines by 9% of a cap
height.

Recalibrated against the supplied Nike Pegasus reference, measured rather than
eyeballed: its headline lines sit **17% of a cap height** apart. For Anton that
is `line-height: 1`, which is what is set.

| line-height | ink gap (% of cap height) |
|---|---|
| .78 | −9% (overlapping) |
| .86 | 0% (touching) |
| .93 | 8% |
| **1.00** | **17% — matches the reference** |
| 1.06 | 24% |

Hero subhead also matched to the reference: `.hero .lede` is now `#fff` at
weight 500, up from `var(--muted)` (80% white) at 400.

Scoped to `.d1` and the hero lede. `.d2`/`.d3`/`.d4` still inherit `.86` from
`.disp`, where they also touch — worth revisiting together.
`preview/h1-leading.html` renders the options in real Anton with the measurements.
Re-checked after: the 100px logo clearance still holds on all 25 pages (min 101px).

## Batch, 3 Sep 2026 (late)

- **Display leading site-wide.** `.disp{line-height:1}` now covers d1/d2/d3 plus
  the Anton `.stat b` numbers — 171 display headings verified at exactly 1.000 ×
  font-size, i.e. a 17% ink gap for Anton's 0.858em caps.
- **Pure white content copy.** `--muted` is now `#fff` (was 80% white), plus
  `.tile p`, `.plan.feature` copy, `.level-hp p`, `.ptable tbody td` and
  `.prose .callout`. Deliberately left as-is: nav dropdown links, `.hero-meta`,
  chips, footer links and bar, the struck-through initiation price, and hairline
  dividers — those are chrome or intentionally secondary, not content.
- **Navigation.** All 12 dropdown descriptions removed; `.drop a` 0.92rem →
  1.045rem (14.72px → 16.72px, exactly +2px). The dead `.drop small` rule is
  gone. The mobile nav never carried descriptions. The two remaining `<small>`
  per page are the App Store / Google Play button labels.
- **`.kv` rows** now align on the text baseline instead of centring boxes. The
  dd usually holds an `.arrow-link`, an inline-flex that sat ~10px low inside its
  own line box; baseline also does the right thing for the two-line address dd.
- **Contact** — the "Submitting opens an email…" note removed. The same note
  still appears on the corporate-memberships and camp-interest forms with
  different wording; left for now.
- **Careers** — position pills removed from both cards, the small "Open Roles"
  eyebrow removed, the "What Every Role Includes" benefits section deleted, and
  the Why RacFit copy softened to "health and wellness benefit options for most".
  The section H2 is still "Two ways in." — awaiting the replacement wording.
- **Foundation image** (`about.html`) — display height cut 30% via
  `aspect-ratio:964/805;object-fit:cover;object-position:50% 6%`. The box goes
  628×749 → 628×524 at 1440. Nothing is squashed; the crop is anchored near the
  top because her head sits at the very top of the frame, with 6% offset so the
  full shirt logo still reads. The `width`/`height` attributes stay at the true
  file size so the CLS and dimension checks remain honest.
  Note this is still the AI-generated placeholder flagged earlier for replacement.

### Navigation sizing
`.nav-link` (main bar) `.94rem` → **`1rem`** (15.04px → 16px, +1px).
`.drop a` (dropdown) `1.045rem` → **`1rem`**, so both navigation levels now sit
at exactly 16px — verified as one computed value across 5 main items and 22
dropdown items. The mobile nav (`.mnav a`, 1.4rem Anton) is a separate treatment
and unchanged.

### Homepage hero rotation (3 Sep 2026)
Two photos added — `pickleball-doubles-outdoor-buda-tx.jpg` and
`junior-high-performance-team-buda-tx.jpg` (both 1536×1024). The empty indoor
court (`indoor-tennis-courts-net-view-buda-tx.jpg`) was removed from the hero.

Now 11 slides, reordered so no two consecutive slides share a subject —
aerial → tennis → pickleball → social → juniors → fitness → pickleball → social
→ juniors → facility → social. Slide 1 keeps `.on` + `fetchpriority="high"`;
every other slide is `loading="lazy"`.

The empty indoor court photo is **still used in the homepage gallery strip**
(index.body.html, the `.gal-slide` row) — left there deliberately, since the
request was scoped to the hero.

## Junior tennis, fitness & cantina batch (3 Sep 2026, late)

- **Pathway rings** — "Every player starts in the middle and works outward."
  removed. The grid already had `align-items:center`, so with the note gone the
  rings sit dead centre against the copy column (measured: 0px offset).
- **Orange Ball / Green Ball** cards now carry photos (`orange ball1` and
  `Green 2`), matching the Red Ball card that already had one.
- **High Performance** rebuilt as a photo section: the copy stays on the solid
  navy `.level-hp` panel and an 8-tile `.hp-gal` mosaic sits directly beneath it.
  No text is ever set over a photograph, so nothing gets lost in the imagery.
  4 columns × 2 rows on desktop, 2 columns on tablet, 1 on phones — 8 tiles fill
  every grid cell with no holes.
- **HP crops** — each photo was cropped to 4:3 around its subject rather than
  centre-cropped. Subject boxes came from an HOG people detector; the running
  forehand was placed by hand after the detector locked onto a bystander in the
  background instead of the player. Subjects fill 58–80% of frame height.
  The team line-up is deliberately *not* zoomed — it takes the widest possible
  4:3 so nobody at the ends is cut off, and it is the same file the homepage
  hero uses.
- **Michael Carson's staff photo** re-cut from the fresh headshot. The first
  attempt keyed on luminance, which chopped him up: his navy polo (V≈85) is
  nearly as dark as the black backdrop (V≈5). Keying on **saturation** separates
  them cleanly (polo S≈126, backdrop S≈0), with the mask restricted to
  background regions connected to the frame edge so dark areas *on* him survive.
- **Fitness** — "Coaches who meet you / where you are." on two lines. The break
  alone was not enough: `.sec-head` is capped at `70ch` of *body* text (~662px),
  far too narrow for an 80px display line, so that one section head is widened
  to `90ch` (~851px). `.lede` keeps its own 62ch cap, so the paragraph measure
  is unchanged.
  `fitness-studio-buda-tx.jpg` replaced with the "Fitness Barb" photo — note it
  is used on **about.html** as well as fitness.html, so both changed; alt text
  and dimensions updated in both.
- **Homepage Courtside Cantina** — the "Courtside Cantina" eyebrow is now the
  Cantina logo (`assets/logos/courtside-cantina-white.png`, trimmed from an
  8216×2570 source). It is a white logo, so it only works on the dark `.mid`
  panel — do not move it onto a light background without a dark version.
