# Forms

Static site, no backend, no third-party form service. A Cloudflare Worker takes the
POST, verifies a Turnstile token, and sends the email through Resend.

The handler is `src/index.js`, deployed exactly as written — no compile step, no
dependencies. It does its own routing on `/api/<form>` in four lines at the
bottom of the file.

    browser  ──POST /api/<form>──>  src/index.js  (the Worker)
                                      │
                                      ├─ honeypot check        (silent drop)
                                      ├─ Turnstile siteverify  (fails closed)
                                      ├─ validate against the registry
                                      ├─ Resend send API
                                      ├─ archive to KV         (optional)
                                      └─ 303 ──> /thank-you?f=<form>

No JavaScript is involved on the page. A visitor with scripts blocked can still
submit — the browser posts the form and follows the redirect itself.

## The seven forms

| Endpoint | Page | Goes to |
|---|---|---|
| `/api/contact` | contact | info@ |
| `/api/tour` | tour | contact@ |
| `/api/corporate-events` | corporate-events | contact@ |
| `/api/corporate-memberships` | corporate-memberships | michelle@ |
| `/api/camp-interest` | juniors | contact@ |
| `/api/birthday-party` | birthday-parties | contact@ |
| `/api/careers` | careers | contact@ |

Recipients live in the `FORMS` registry in the handler. **They are never read from
the request.** A form endpoint that mails a submitter-supplied address is an open
relay: it gets found, used for phishing, and burns the sending domain's reputation.
`reply_to` is the submitter, so staff can just hit reply, but it is never a
recipient and only set after it validates as an email address.

Only fields named in the registry are read — anything else is dropped, so nobody
can inject extra content into the email by adding inputs with a browser console.

## Environment variables

Set on the Worker: **Settings → Variables and Secrets**. Add the two credentials as
**Secrets**, not plaintext variables.

| Name | Type | Notes |
|---|---|---|
| `RESEND_API_KEY` | secret | Create it in Resend with **Sending access** only, scoped to `goracfit.com`. Nothing else. |
| `TURNSTILE_SECRET` | secret | From the Turnstile widget. |
| `TURNSTILE_SITEKEY` | *not needed* | The site key is public and is committed as the default in `build.py`, so a local build matches production. Set this only to point a second site or a test widget at a different key. |
| `SUBMISSIONS` | optional | KV namespace **binding** in `wrangler.jsonc`. Bind it and every submission is archived; leave it unbound and that step is skipped silently. |
| `ALLOW_UNVERIFIED` | testing only | `"true"` lets forms work before the Turnstile widget exists. **Never set in production.** |

The site key (`0x4AAA…`) and the secret key are not interchangeable. The site key
belongs in the HTML and is committed. The secret key must only ever exist as an
encrypted Pages variable — if it appears in the repo, rotate the widget.

Turnstile verification **fails closed**: with no `TURNSTILE_SECRET` and no
`ALLOW_UNVERIFIED`, forms return 503 rather than accepting unverified mail. That is
deliberate — an unprotected public mail endpoint gets abused within days.

## Resend setup

Sending address is `contact@goracfit.com`, so add **`goracfit.com`** as the domain
in Resend. Resend then asks for records on a `send.` subdomain rather than the apex,
which is the reason this is low-risk: **the club's existing apex MX and SPF records
are not touched.**

Expect roughly this set — copy the actual values from the Resend dashboard, do not
retype these:

| Type | Host | Purpose |
|---|---|---|
| MX | `send` | Return path for bounces and complaints. Priority 10. |
| TXT | `send` | SPF for the return path, e.g. `v=spf1 include:amazonses.com ~all`. |
| TXT / CNAME | `resend._domainkey` | DKIM. Signs as `goracfit.com`, which is what gives DMARC alignment. |
| CNAME | `links` | Optional, click tracking. Not needed for these forms — skip it. |

Three things to get right:

1. **Do not touch the apex SPF record.** Resend's SPF goes on `send.goracfit.com`.
   Editing the apex record is how you break staff email, and it is not required
   here. If a guide tells you to add an `include:` at the apex, it is describing a
   different setup.
2. **Do not enable Inbound on `goracfit.com`.** Inbound makes Resend receive *all*
   mail for the domain it is enabled on. This is a send-only setup.
3. **Test each form before launch** and confirm it lands in the inbox, not spam.
   DKIM alignment is what keeps it there once DMARC is on.

**Note on from == to.** Five of the seven forms deliver to `contact@goracfit.com`,
which is now also the sending address, so those messages are from and to the same
mailbox. Delivery is fine and `reply_to` still points at the visitor, but
self-addressed mail threads awkwardly in Gmail and some filters view it with
suspicion. A dedicated `website@goracfit.com` as the sender would avoid both — it
is a one-line change to `SITE.from`.

**Why Resend and not SparkPost.** SparkPost was the original choice, but it is now
Bird, and a new signup lands on Bird's platform API (`/v1/email/messages`) rather
than the legacy `api.sparkpost.com/api/v1/transmissions` endpoint the handler was
first written against. Rather than target an API mid-rebrand, this sends through
Resend: stable endpoint, one flat JSON body, an official Cloudflare Workers
tutorial, and DNS records that stay off the apex.

Swapping provider again is a change to the one `fetch` call in `send()` — Postmark
and most others take a nearly identical payload — so this is not a lock-in
decision. **Confirm the current free-tier limits before launch either way.**

## Porting this to another site

The handler is one file with no imports and no build step, on purpose.

1. Copy `src/index.js` and `wrangler.jsonc` into the new project.
2. Rewrite the `CONFIG` block at the top: `SITE` and the `FORMS` registry.
   In `wrangler.jsonc`, change `name` and keep `run_worker_first: ["/api/*"]` —
   without it the asset layer answers the form POSTs with the 404 page.
3. Point each form's `action` at `/api/<key>`, and give every form a honeypot
   (`name="_gotcha"`, `.hp` class) and a `.cf-turnstile` div.
4. Set the same environment variables.
5. Create a thank-you page at whatever `SITE.thankYou` says.

Nothing else carries over. No build step, no dependencies, no package.json.

## Keeping the registry and the markup in step

The failure mode here is silent: rename a field in the HTML, forget the registry,
and that field stops arriving in the email with no error anywhere. A parity check
catches it — it compares every form's field names and `required` flags against the
registry and found two real mismatches the first time it ran (`topic` and
`company` were required in the markup but optional server-side, so a submission
that bypassed the browser could arrive incomplete).

Run it after touching any form. Server-side validation must be at least as strict
as the browser's, never looser.

## Rate limiting

Turnstile is the main defence. For a hard ceiling, add a Cloudflare WAF rate-limit
rule on `/api/*` — the Function itself is stateless and cannot count requests.

## What is deliberately not here

- **File uploads.** Résumés are directed to contact@goracfit.com in the careers
  form's footnote instead. Cheaper, and nothing to store or secure.
- **A submissions dashboard.** Emails are the record unless the KV binding is
  added. Bind `SUBMISSIONS` if lead history matters.
