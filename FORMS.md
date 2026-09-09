# Forms

Static site, no backend, no third-party form service. A Cloudflare Pages Function
takes the POST, verifies a Turnstile token, and sends the email through SparkPost.

    browser  ──POST /api/<form>──>  functions/api/[form].js
                                      │
                                      ├─ honeypot check        (silent drop)
                                      ├─ Turnstile siteverify  (fails closed)
                                      ├─ validate against the registry
                                      ├─ SparkPost transmissions API
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

Set in the Cloudflare Pages dashboard, Settings → Environment variables. Mark the
two secrets as **encrypted**. Set them for Production *and* Preview, or forms
break on preview deployments.

| Name | Type | Notes |
|---|---|---|
| `SPARKPOST_API_KEY` | secret | Needs only the **Transmissions: Read/Write** grant. Nothing else. |
| `TURNSTILE_SECRET` | secret | From the Turnstile widget. |
| `TURNSTILE_SITEKEY` | *not needed* | The site key is public and is committed as the default in `build.py`, so a local build matches production. Set this only to point a second site or a test widget at a different key. |
| `SPARKPOST_BASE` | optional | `https://api.eu.sparkpost.com` for an EU account. |
| `SUBMISSIONS` | optional | KV namespace **binding**. Bind it and every submission is archived; leave it unbound and that step is skipped silently. |
| `ALLOW_UNVERIFIED` | testing only | `"true"` lets forms work before the Turnstile widget exists. **Never set in production.** |

The site key (`0x4AAA…`) and the secret key are not interchangeable. The site key
belongs in the HTML and is committed. The secret key must only ever exist as an
encrypted Pages variable — if it appears in the repo, rotate the widget.

Turnstile verification **fails closed**: with no `TURNSTILE_SECRET` and no
`ALLOW_UNVERIFIED`, forms return 503 rather than accepting unverified mail. That is
deliberate — an unprotected public mail endpoint gets abused within days.

## SparkPost setup

Sending address is `contact@goracfit.com`, so the domain to verify in SparkPost is
the **apex** — the same domain staff mail runs on. That works, but two records need
care:

1. **DKIM.** Add the CNAME or TXT selector SparkPost gives you. Multiple DKIM
   selectors coexist happily, so this cannot disturb existing mail.
2. **SPF.** There must be exactly **one** SPF TXT record on a domain. Do not add a
   second one — add SparkPost's `include:` to the record already there:

       v=spf1 include:_spf.google.com include:sparkpostmail.com ~all

   Two SPF records is a permanent error state and breaks *all* mail from the
   domain, including staff email. SPF also has a hard limit of 10 DNS lookups;
   check the total if the record already has several includes.
3. Send a test through each form and confirm it lands in the inbox, not spam,
   before launch. DKIM alignment is what keeps it out of spam once DMARC is on.

**Note on from == to.** Five of the seven forms deliver to `contact@goracfit.com`,
which is now also the sending address, so those messages are from and to the same
mailbox. Delivery is fine and `reply_to` still points at the visitor, but
self-addressed mail threads awkwardly in Gmail and some filters view it with
suspicion. A dedicated `website@goracfit.com` as the sender would avoid both — it
is a one-line change to `SITE.from`.

SparkPost is now part of Bird. The free developer tier is around 500 emails/month,
which covers a club's form volume; past that, pricing is "contact sales" with
nothing published. **Confirm the current tier before launch.** Swapping provider is
a change to the one `fetch` call in `send()` — Resend and Postmark take a nearly
identical payload — so this is not a lock-in decision.

## Porting this to another site

The handler is one file with no imports, on purpose.

1. Copy `functions/api/[form].js` into the new project.
2. Rewrite the `CONFIG` block at the top: `SITE` and the `FORMS` registry.
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
