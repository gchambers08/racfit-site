/* RacFit - site behaviour */
(function () {
  'use strict';

  /* Sticky header state */
  var hdr = document.querySelector('.hdr');
  function onScroll() {
    if (!hdr) return;
    hdr.classList.toggle('solid', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile nav */
  var burger = document.querySelector('.burger');
  var mnav = document.querySelector('.mnav');
  var mclose = document.querySelector('.mclose');
  function setNav(open) {
    if (!mnav) return;
    mnav.classList.toggle('open', open);
    document.body.classList.toggle('nav-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (mclose) mclose.style.display = open ? 'flex' : 'none';
    if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (burger) burger.addEventListener('click', function () { setNav(!mnav.classList.contains('open')); });
  if (mclose) mclose.addEventListener('click', function () { setNav(false); });
  if (mnav) mnav.addEventListener('click', function (e) { if (e.target.tagName === 'A') setNav(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });

  /* Scroll reveal */
  var rvs = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && rvs.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    rvs.forEach(function (el, i) {
      el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      io.observe(el);
    });
  } else {
    rvs.forEach(function (el) { el.classList.add('in'); });
  }

  /* Accordions */
  document.querySelectorAll('.acc-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.acc-item');
      var panel = item.querySelector('.acc-panel');
      var open = item.classList.toggle('open');
      panel.style.maxHeight = open ? panel.scrollHeight + 'px' : 0;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* Rotating image sets - the homepage hero and any product tile.
     Add data-rotate="<ms>" to a container whose children are .slide elements. */
  document.querySelectorAll('[data-rotate]').forEach(function (box) {
    var slides = box.querySelectorAll(':scope > .slide');
    if (slides.length < 2) return;
    var delay = parseInt(box.getAttribute('data-rotate'), 10) || 5500;
    var i = 0, timer = null;
    var dots = box.querySelector('.rotator-dots');
    var count = box.querySelector('.rotator-count');
    var buttons = [];

    function show(n) {
      slides[i].classList.remove('on');
      if (buttons[i]) buttons[i].setAttribute('aria-current', 'false');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('on');
      if (buttons[i]) buttons[i].setAttribute('aria-current', 'true');
      if (count) count.textContent = (i + 1) + ' of ' + slides.length;
    }
    function start() { stop(); timer = setInterval(function () { show(i + 1); }, delay); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    if (dots) {
      slides.forEach(function (_, n) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Show photo ' + (n + 1) + ' of ' + slides.length);
        btn.setAttribute('aria-current', n === 0 ? 'true' : 'false');
        btn.addEventListener('click', function () { show(n); start(); });
        dots.appendChild(btn);
        buttons.push(btn);
      });
      box.addEventListener('mouseenter', stop);
      box.addEventListener('mouseleave', start);
    }
    start();
  });

  /* Forms POST to /api/<form>, a Cloudflare Pages Function, and the browser
     follows its 303 to the thank-you page. No JavaScript is involved, so a
     visitor with scripts blocked can still send one. */


  /* ---------- Staff bios in a dialog ----------
     The markup ships as <details>/<summary>, which works with no JS at all.
     Where <dialog> is supported we intercept the toggle and show the same
     content in a modal instead: the card never grows, the bio gets a readable
     measure rather than a narrow column, and showModal() gives us focus
     trapping and Esc for free. If any of this is unavailable the <details>
     expander is left exactly as it was. */
  var bios = document.querySelectorAll('.staff-bio');
  if (bios.length && typeof HTMLDialogElement === 'function' &&
      typeof document.createElement('dialog').showModal === 'function') {

    var dlg = document.createElement('dialog');
    dlg.className = 'bio-modal';
    dlg.innerHTML =
      '<form method="dialog" class="bio-modal-close-form">' +
        '<button class="bio-modal-close" aria-label="Close">&times;</button>' +
      '</form>' +
      '<div class="bio-modal-in">' +
        '<div class="bio-modal-head">' +
          '<img alt="" width="720" height="900">' +
          '<div><h2 id="bio-modal-name"></h2><p class="bio-modal-role"></p></div>' +
        '</div>' +
        '<div class="bio-modal-body"></div>' +
      '</div>';
    dlg.setAttribute('aria-labelledby', 'bio-modal-name');
    document.body.appendChild(dlg);

    var mImg  = dlg.querySelector('.bio-modal-head img');
    var mName = dlg.querySelector('#bio-modal-name');
    var mRole = dlg.querySelector('.bio-modal-role');
    var mBody = dlg.querySelector('.bio-modal-body');
    var opener = null;

    document.documentElement.classList.add('has-bio-modal');

    bios.forEach(function (d) {
      var summary = d.querySelector('summary');
      if (!summary) return;
      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var card = d.closest('.staff-card');
        var img  = card && card.querySelector('img');
        var name = card && card.querySelector('b');
        var role = card && card.querySelector('span');
        var body = d.querySelector('div');

        if (img) { mImg.src = img.getAttribute('src'); mImg.alt = img.getAttribute('alt') || ''; }
        mImg.hidden = !img;
        mName.textContent = name ? name.textContent : '';
        mRole.textContent = role ? role.textContent : '';
        mBody.innerHTML = body ? body.innerHTML : '';
        mBody.scrollTop = 0;

        opener = summary;
        dlg.showModal();
      });
    });

    /* click the backdrop to dismiss */
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) dlg.close();
    });
    dlg.addEventListener('close', function () {
      if (opener) { opener.focus(); opener = null; }
    });
  }

  /* Careers: the two role pages link in as careers.html?role=<name>#apply, so
     preselect that option. Falls back to an empty select with no JS. */
  (function () {
    var sel = document.getElementById('ap-role');
    if (!sel) return;
    var want = new URLSearchParams(location.search).get('role');
    if (!want) return;
    for (var i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === want) { sel.selectedIndex = i; return; }
    }
  })();

  /* Marquee: duplicate track content so the loop is seamless */
  document.querySelectorAll('.marquee-track, .gal-track').forEach(function (track) {
    track.innerHTML = track.innerHTML + track.innerHTML;
  });
})();
