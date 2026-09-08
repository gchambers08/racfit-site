# Integrating the RacFit AI assistant (Topspin Tommy)

Written 3 Sep 2026, from inspecting `https://691a8de8.racfit-ai.pages.dev/widget`
in a browser — response headers, DOM geometry, JS bundle and network payload.

## Recommendation: a lazily-mounted cross-origin iframe

The widget is already built for this and nothing else fits as well:

| Evidence | What it means |
|---|---|
| `content-security-policy: frame-ancestors 'self' https://goracfit.com https://*.goracfit.com` | The app **explicitly whitelists goracfit.com as an embedder.** Framing is the designed path, and it already covers both the apex and every subdomain, so the www-vs-apex decision does not break it. |
| `<html>` and `<body>` backgrounds are `rgba(0,0,0,0)` | Deliberately transparent, so it composites over the host page. Only an iframe embed needs that. |
| `x-robots-tag: noindex` on `/widget` | Already kept out of search results. Correct. |
| `access-control-allow-origin: *`, chat API on the widget's own origin | Inside an iframe every request stays first-party. **No CORS work, no API keys on goracfit.com, no shared cookies.** A script-tag embed would need all three. |
| Next.js app, 15 requests, **1,067 KB transferred / 1.6 MB uncompressed** | Heavier than any page on the RacFit site. It must not load on page load — see "Lazy mount" below. |

A script-tag embed would mean shipping the assistant's JS into the RacFit page's
own origin: shared globals, shared cookies, its CSS able to leak into ours and
ours into it, and its 1 MB counted against our own Core Web Vitals. The iframe
keeps a hard boundary in both directions. Use the iframe.

## Measured geometry

| State | Panel | Position | Iframe needs to be |
|---|---|---|---|
| Closed | 56 × 56 launcher | `right:16 bottom:16` | **88 × 88** |
| Open, desktop | 380 × 560 | `right:16 bottom:80` | **412 × 656** |
| Open, phone (375px) | 343 × 560 | `right:16 bottom:80` | 375 × 656 |

The widget handles small screens itself — at 375px it reflows to 343 wide with
even 16px margins. Nothing to do there beyond capping the iframe at the viewport.

## One thing has to change first

**A cross-origin iframe cannot be measured or resized from the host page.** The
widget's own bundle contains no `postMessage` — I checked all four chunks; the
only hits are inside React and the polyfills. So the host has no way to know the
panel opened, and the iframe cannot be sized to fit it.

That leaves only bad options: an iframe permanently sized for the open panel is
**412 × 656 of invisible click-blocking** over the bottom-right corner of every
page — on the RacFit homepage that lands on hero buttons, card links and footer
links depending on scroll. Guessing the state from focus or hover events is
fragile and will collapse the panel mid-conversation.

The fix is about eight lines in the widget app. Wherever its open state lives:

```js
// Tell the embedding page how much room the widget needs.
useEffect(() => {
  if (window.parent === window) return;           // not embedded, nothing to do
  window.parent.postMessage(
    { type: 'racfit-widget', state: isOpen ? 'open' : 'closed' },
    'https://www.goracfit.com'                    // repeat for the apex if both are live
  );
}, [isOpen]);
```

The payload carries no user data, so `'*'` as the target origin would also be
safe — but naming the origin is the better habit.

**Smaller alternative if that is awkward:** support `?open=1` on `/widget` so it
mounts with the panel already expanded. Then RacFit renders its own launcher
button, and the iframe is only in the DOM while the assistant is open — no
click-blocking, no messages. It costs one line in the app, but RacFit's launcher
then has to be styled and maintained separately from Tommy's. The `postMessage`
route is the one I would pick: the widget keeps ownership of its own launcher and
the host code below never needs touching again.

## Also required: a stable URL

`691a8de8.racfit-ai.pages.dev` is a **per-commit Cloudflare Pages preview hash.**
It changes on every deploy, so it must never be hardcoded. Point a custom
hostname at the Pages project — `ai.goracfit.com` or `assistant.goracfit.com` —
and use that. The snippet below has it as a single constant.

## Host-side code

Zero markup changes. `racfit.js` and `racfit.css` are already on all 25 pages via
`_parts/footer.html` and `_parts/head.html`, so this reaches every page and every
future page automatically.

### Append to `assets/css/racfit.css`

```css
/* ---------- RacFit AI assistant ----------
   z-index 890 puts it under the header (900) and under the mobile nav overlay
   (950), so opening the burger menu covers the assistant rather than the
   assistant floating over the navigation. */
#racfit-ai-frame{
  position:fixed;right:0;bottom:0;z-index:890;
  border:0;background:transparent;
  transition:width .28s var(--ease),height .28s var(--ease);
}
@media(prefers-reduced-motion:reduce){#racfit-ai-frame{transition:none}}
```

### Append inside the existing IIFE in `assets/js/racfit.js`

```js
  /* ---------- RacFit AI assistant (Topspin Tommy) ----------
     Cross-origin iframe, so all of the assistant's traffic stays on its own
     origin and nothing here can read or write its data.

     Mounted lazily: the widget is ~1 MB over 15 requests, which is heavier than
     any page on this site, so no page pays for it until the visitor is likely
     to want it.

     Sized by message: a cross-origin frame cannot be measured from here, so the
     widget reports its own state and we match it. Until the widget sends that
     message the frame stays at launcher size and the open panel would be
     clipped - the contract is required, not optional. */
  var AI_ORIGIN = 'https://ai.goracfit.com';   /* production host - never a preview hash */
  var AI_SRC    = AI_ORIGIN + '/widget';
  var AI_CLOSED = { w: 88,  h: 88  };          /* 56px launcher + 16px inset + shadow */
  var AI_OPEN   = { w: 412, h: 656 };          /* 380x560 panel at right:16 bottom:80 */

  (function () {
    var frame = null;

    function sizeTo(s) {
      frame.style.width  = 'min(' + s.w + 'px, calc(100vw - 8px))';
      frame.style.height = 'min(' + s.h + 'px, calc(100vh - 8px))';
    }

    function mount() {
      if (frame) return;
      frame = document.createElement('iframe');
      frame.id = 'racfit-ai-frame';
      frame.title = 'RacFit program assistant';
      frame.setAttribute('allow', 'clipboard-write');
      frame.src = AI_SRC;
      sizeTo(AI_CLOSED);
      document.body.appendChild(frame);
    }

    window.addEventListener('message', function (e) {
      if (e.origin !== AI_ORIGIN) return;      /* only ever trust the widget origin */
      var d = e.data;
      if (!d || d.type !== 'racfit-widget' || !frame) return;
      if (d.state === 'open')   sizeTo(AI_OPEN);
      if (d.state === 'closed') sizeTo(AI_CLOSED);
    });

    /* whichever comes first: the browser going idle, or the first scroll */
    var mounted = false;
    function go() { if (mounted) return; mounted = true; mount(); }
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 });
    else setTimeout(go, 2500);
    window.addEventListener('scroll', go, { once: true, passive: true });
  })();
```

## Two things to know before testing

**It will look broken on `file://`.** `frame-ancestors` allows only
`goracfit.com` and its subdomains, so opening the built HTML straight off disk —
which is how these pages have been previewed all along — will show an empty
frame and a CSP error in the console. That is the policy working correctly. To
test before launch, either add the staging origin to `frame-ancestors` in the
widget app, or test on the real domain.

**The privacy policy needs a line.** It currently says data is collected "via
email or other direct contact from you." An assistant that takes typed questions
— and may collect a name or email to route someone to a coach — is neither. It
should be named, along with where those conversations go and how long they are
kept. Worth a look from whoever signed off the policy, alongside the three
unfilled SMS placeholders already flagged in the Terms.

## One expectation to set

Iframed content is invisible to search engines, and `/widget` is `noindex`
anyway. If the assistant can answer "what does stringing cost" or "what age can
my child start", **that content earns nothing in search while it lives only in
the chat.** It is a conversion tool, not an SEO asset. Keep the real answers on
real pages — which is what the FAQ and question-led pages in the SEO plan are
for — and let the assistant be the faster path for people already on the site.
