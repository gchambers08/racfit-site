#!/usr/bin/env python3
"""Verify every form's markup matches the handler's field registry.

Run after touching any form:   python3 check-forms.py

The failure this catches is silent. Rename a field in the HTML and forget the
registry, and that field simply stops arriving in the email - no error anywhere,
on either side. It also catches a required flag that exists in the browser but
not on the server, which lets a client-bypassing submission arrive incomplete.

Exits non-zero on any mismatch, so it can gate a commit.
"""
import io, re, glob, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__)) or '.'
HANDLER = os.path.join(ROOT, 'functions', 'api', '[form].js')
PAGES = os.path.join(ROOT, 'dist', 'client', '*.html')
IGNORE = {'_gotcha', 'cf-turnstile-response'}


def registry():
    src = io.open(HANDLER, encoding='utf-8').read()
    out = {}
    for m in re.finditer(r"^  '([a-z-]+)': \{.*?fields: \{(.*?)^    \},", src, re.M | re.S):
        out[m.group(1)] = {
            f: ('required: true' in spec)
            for f, spec in re.findall(r'^\s+([a-zA-Z]+):\s*\{([^}]*)\}', m.group(2), re.M)
        }
    return out


def main():
    reg = registry()
    if not reg:
        sys.exit('could not parse the FORMS registry - has the handler moved?')

    seen, problems = set(), []
    for page in sorted(glob.glob(PAGES)):
        html = io.open(page, encoding='utf-8').read()
        name = os.path.basename(page)
        for m in re.finditer(r'<form[^>]*action="/api/([a-z-]+)"(.*?)</form>', html, re.S):
            key, body = m.group(1), m.group(2)
            seen.add(key)
            if key not in reg:
                problems.append('%s posts to /api/%s, which the handler does not define'
                                % (name, key))
                continue
            fields = set(re.findall(
                r'<(?:input|select|textarea)[^>]*name="([^"]+)"', body)) - IGNORE
            required = set(re.findall(
                r'<(?:input|select|textarea)[^>]*name="([^"]+)"[^>]*required', body))
            spec = set(reg[key])
            spec_required = {f for f, r in reg[key].items() if r}

            for f in sorted(fields - spec):
                problems.append('%s: %s has "%s" in the markup but not the registry - '
                                'it will be silently dropped' % (name, key, f))
            for f in sorted(spec - fields):
                problems.append('%s: %s expects "%s" in the registry but no input has it'
                                % (name, key, f))
            for f in sorted(required - spec_required):
                problems.append('%s: %s marks "%s" required in the browser but not on the '
                                'server - a bypassed submission could arrive without it'
                                % (name, key, f))
            for f in sorted(spec_required - required):
                problems.append('%s: %s requires "%s" server-side but the input is optional '
                                '- the visitor gets a server error instead of a hint'
                                % (name, key, f))
            if not problems:
                print('  %-24s %2d fields, %d required' % (key, len(fields), len(required)))

        # a Turnstile div and a honeypot on every form
        if '<form' in html and 'action="/api/' in html:
            if 'cf-turnstile' not in html:
                problems.append('%s has a form but no Turnstile widget' % name)
            if '_gotcha' not in html:
                problems.append('%s has a form but no honeypot' % name)

    for key in sorted(set(reg) - seen):
        problems.append('/api/%s is defined but no form posts to it' % key)

    if problems:
        print()
        for p in problems:
            print('  FAIL  ' + p)
        sys.exit('\n%d problem(s)' % len(problems))
    print('\n%d forms, all matching the registry' % len(seen))


if __name__ == '__main__':
    main()
