#!/usr/bin/env python3
"""RacFit static-site QA suite.

Runs five independent checks over every built page:
  1. HTML well-formedness (tag balance)
  2. Broken internal links, missing anchors, missing local assets
  3. Horizontal overflow sweep across 11 viewport widths
  4. Image aspect-ratio distortion (rendered ratio vs intrinsic ratio)
  5. Rendered text contrast against the actual painted background (WCAG AA)
  6. Mid-word breaks in display headings

Usage: python3 qa_suite.py [site_dir]
Exit code 0 when every check passes.
"""
import sys, os, re, html.parser, json, pathlib, asyncio

SITE = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/site')
PAGES = sorted(p.name for p in SITE.glob('*.html'))
WIDTHS = [320, 360, 375, 390, 414, 560, 768, 1024, 1440, 1728, 1920]
VOID = {'area','base','br','col','embed','hr','img','input','link','meta',
        'param','source','track','wbr'}


# ---------------------------------------------------------------- 1. tag balance
class Balance(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.errors = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f'stray </{tag}> at {self.getpos()}')
            return
        if self.stack[-1][0] == tag:
            self.stack.pop()
        else:
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i][0] == tag:
                    for t, pos in self.stack[i + 1:]:
                        self.errors.append(f'unclosed <{t}> opened at {pos}')
                    del self.stack[i:]
                    break
            else:
                self.errors.append(f'stray </{tag}> at {self.getpos()}')


def check_parse():
    out = []
    for name in PAGES:
        b = Balance()
        b.feed((SITE / name).read_text(encoding='utf-8'))
        for t, pos in b.stack:
            b.errors.append(f'unclosed <{t}> opened at {pos}')
        out += [f'{name}: {e}' for e in b.errors]
    return out


# ------------------------------------------------- 2. links / anchors / assets
def check_links():
    ids = {}
    for name in PAGES:
        src = (SITE / name).read_text(encoding='utf-8')
        ids[name] = set(re.findall(r'\bid="([^"]+)"', src))
    problems = []
    for name in PAGES:
        src = (SITE / name).read_text(encoding='utf-8')
        refs = re.findall(r'(?:href|src)="([^"]+)"', src)
        for r in refs:
            if r.startswith(('http://', 'https://', 'mailto:', 'tel:', 'sms:', 'data:', '#')):
                if r.startswith('#') and r[1:] and r[1:] not in ids[name]:
                    problems.append(f'{name}: missing anchor {r}')
                continue
            path, _, frag = r.partition('#')
            if not path:
                continue
            target = (SITE / path).resolve()
            if not target.exists():
                problems.append(f'{name}: missing file {path}')
            elif frag and path.endswith('.html'):
                tn = os.path.basename(path)
                if tn in ids and frag not in ids[tn]:
                    problems.append(f'{name}: missing anchor {path}#{frag}')
    return problems


# ------------------------------------------------------------ browser checks
JS_OVERFLOW = """() => {
  const de = document.documentElement;
  const slop = 2;
  const out = [];
  if (de.scrollWidth > de.clientWidth + slop)
    out.push({sel:'<html>', sw:de.scrollWidth, cw:de.clientWidth});
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > de.clientWidth + slop || r.left < -slop) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.visibility === 'hidden' || cs.display === 'none') continue;
      // ignore anything an ancestor clips (marquees, carousels, cover crops)
      let clipped = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        const ac = getComputedStyle(a);
        if (/hidden|clip|auto|scroll/.test(ac.overflowX)) { clipped = true; break; }
        if (a === document.body) break;
      }
      if (clipped) continue;
      out.push({sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : ''),
                left: Math.round(r.left), right: Math.round(r.right)});
      if (out.length > 6) break;
    }
  }
  return out;
}"""

JS_DISTORT = """() => {
  const out = [];
  for (const img of document.images) {
    if (!img.naturalWidth || !img.naturalHeight) continue;
    const cs = getComputedStyle(img);
    if (cs.objectFit === 'cover' || cs.objectFit === 'contain') continue;
    const r = img.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const want = img.naturalWidth / img.naturalHeight;
    const got = r.width / r.height;
    if (Math.abs(want - got) / want > 0.02)
      out.push({src: img.currentSrc.split('/').pop(), want: +want.toFixed(3), got: +got.toFixed(3)});
  }
  return out;
}"""

JS_CONTRAST = """() => {
  const lin = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
  const lum = ([r,g,b]) => 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b);
  const parse = s => {
    const m = s.match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(/[,\\s/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const over = (fg, bg) => fg.slice(0,3).map((c,i) => fg[3]*c + (1-fg[3])*bg[i]);
  // painted background behind an element, walking ancestors
  const bgOf = el => {
    let stack = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c[3] > 0) { stack.push(c); if (c[3] === 1) break; }
    }
    stack.push([255,255,255,1]);
    let base = stack[stack.length-1].slice(0,3);
    for (let i = stack.length-2; i >= 0; i--) base = over(stack[i], base);
    return base;
  };
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n; (n = walker.nextNode());) {
    const txt = n.nodeValue.trim();
    if (!txt) continue;
    const el = n.parentElement;
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    // effective opacity from ancestors
    let op = 1;
    for (let a = el; a && a !== document.body; a = a.parentElement) op *= +getComputedStyle(a).opacity;
    if (op < 0.05) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = bgOf(el);
    const eff = over([fg[0], fg[1], fg[2], fg[3] * op], bg);
    const l1 = lum(eff), l2 = lum(bg);
    const ratio = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
    const px = parseFloat(cs.fontSize);
    const bold = +cs.fontWeight >= 700;
    const need = (px >= 24 || (bold && px >= 18.66)) ? 3.0 : 4.5;
    if (ratio + 0.005 < need) {
      const key = el.className + '|' + txt.slice(0,30);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ratio: +ratio.toFixed(2), need, px: Math.round(px),
                cls: (typeof el.className === 'string' ? el.className : '') || el.tagName,
                txt: txt.slice(0, 40)});
    }
  }
  return out;
}"""

JS_WORDBREAK = """() => {
  const out = [];
  const sel = '.disp, .d1, .d2, .d3, h1, h2, h3';
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width < 2) continue;
    const cs = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.cssText = `position:absolute;visibility:hidden;white-space:pre;
      font:${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily};
      letter-spacing:${cs.letterSpacing};text-transform:${cs.textTransform};`;
    document.body.appendChild(probe);
    const avail = r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const words = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n; (n = tw.nextNode());) words.push(...n.nodeValue.split(/\\s+/));
    for (const w of words) {
      if (w.length < 4) continue;
      probe.textContent = w;
      if (probe.getBoundingClientRect().width > avail + 0.5)
        out.push({word: w, wordW: Math.round(probe.getBoundingClientRect().width), avail: Math.round(avail)});
    }
    probe.remove();
  }
  return out;
}"""



# Reveal animations fade elements in over ~600ms; measuring mid-transition
# reports false contrast failures. Force the settled state before any check.
JS_SETTLE = """() => {
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(st);
  document.querySelectorAll('.rv').forEach(e => e.classList.add('in'));
  document.querySelectorAll('[data-rotate] .slide').forEach((e,i) => { if (i === 0) e.classList.add('on'); });
}"""

async def browser_checks():
    from playwright.async_api import async_playwright
    over, dist, contrast, wbreak = [], [], [], []
    async with async_playwright() as pw:
        br = await pw.chromium.launch()
        for name in PAGES:
            url = (SITE / name).as_uri()
            # full checks at one representative desktop width
            pg = await br.new_page(viewport={'width': 1440, 'height': 1000})
            await pg.goto(url, wait_until='load')
            await pg.wait_for_timeout(350)
            await pg.evaluate(JS_SETTLE)
            for r in await pg.evaluate(JS_DISTORT):
                dist.append(f"{name}: {r['src']} intrinsic {r['want']} rendered {r['got']}")
            for r in await pg.evaluate(JS_CONTRAST):
                contrast.append(f"{name}: {r['ratio']}:1 (need {r['need']}) {r['px']}px "
                                f".{r['cls']} “{r['txt']}”")
            await pg.close()
            # overflow + word-break sweep
            for w in WIDTHS:
                pg = await br.new_page(viewport={'width': w, 'height': 900})
                await pg.goto(url, wait_until='load')
                await pg.wait_for_timeout(180)
                await pg.evaluate(JS_SETTLE)
                for r in await pg.evaluate(JS_OVERFLOW):
                    over.append(f"{name} @{w}: {r}")
                if w <= 420:
                    for r in await pg.evaluate(JS_WORDBREAK):
                        wbreak.append(f"{name} @{w}: “{r['word']}” "
                                      f"{r['wordW']}px in {r['avail']}px")
                # mobile contrast pass too (type scale changes below 420)
                if w == 375:
                    for r in await pg.evaluate(JS_CONTRAST):
                        contrast.append(f"{name} @375: {r['ratio']}:1 (need {r['need']}) "
                                        f"{r['px']}px .{r['cls']} “{r['txt']}”")
                await pg.close()
        await br.close()
    return over, dist, contrast, wbreak


def main():
    parse = check_parse()
    links = check_links()
    over, dist, contrast, wbreak = asyncio.run(browser_checks())

    def report(label, items, cap=25):
        print(f'\n### {label}: {len(items)}')
        for i in items[:cap]:
            print('   ', i)
        if len(items) > cap:
            print(f'    ... and {len(items)-cap} more')

    report('HTML parse errors', parse)
    report('Link / asset problems', links)
    report('Horizontal overflow', over)
    report('Distorted images', dist)
    contrast = list(dict.fromkeys(contrast))   # de-dupe across viewport passes
    report('Contrast failures', contrast)
    report('Display-heading word breaks', wbreak)

    total = len(parse) + len(links) + len(over) + len(dist) + len(contrast) + len(wbreak)
    print(f'\npages {len(PAGES)} | TOTAL ISSUES {total}')
    return 0 if total == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
