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
