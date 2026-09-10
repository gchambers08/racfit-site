/**
 * Behavioural test for the form handler in src/index.js.
 *
 *     node test-forms.mjs
 *
 * No network, no credentials, no Cloudflare account: global fetch is stubbed,
 * so the "sent" message is captured and inspected instead of delivered. Run it
 * after any change to src/index.js, and especially after changing mail provider
 * - the payload shape is provider-specific and a wrong field name fails
 * silently in production.
 *
 * What it guards, in order of how badly it would hurt:
 *   1. Recipients come from the FORMS registry and NEVER from the request.
 *      A handler that mails a submitter-supplied address is an open relay.
 *   2. Fields not named in the registry are dropped, so extra inputs added in
 *      a browser console cannot inject content into the email.
 *   3. Turnstile fails closed - no secret means no sending, not open sending.
 *   4. All seven endpoints route, and an unknown one is not accepted.
 *
 * src/index.js is ESM but the package has no "type": "module", so Node would
 * read it as CommonJS. Copying it to a .mjs in the temp dir is the least
 * invasive way to import it - no repo config changes, nothing left behind.
 */
import { mkdtempSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'racfit-forms-'));
const copy = join(dir, 'worker.mjs');
copyFileSync('src/index.js', copy);
const worker = (await import('file://' + copy)).default;

const captured = [];
globalThis.fetch = async (url, init) => {
  captured.push({ url: String(url), init });
  return new Response(JSON.stringify({ id: 'stub' }), { status: 200 });
};

// ALLOW_UNVERIFIED skips Turnstile. It exists for exactly this - a local test
// with no widget. It must never be set on the deployed Worker.
const env = { RESEND_API_KEY: 're_TEST_NOT_A_REAL_KEY', ALLOW_UNVERIFIED: 'true' };

const post = (path, fields) => new Request('https://goracfit.com' + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams(fields).toString(),
});

let failed = 0;
const check = (name, ok, detail) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (ok ? '' : '  <- ' + detail));
  if (!ok) failed++;
};

/* 1 -------------------------------------------------- a good submission */
captured.length = 0;
let res = await worker.fetch(post('/api/contact', {
  firstName: 'Test', lastName: 'Person', email: 'visitor@example.com',
  topic: 'Membership', message: 'Hello there',
  // Injected: a recipient override and an unregistered field. Both must vanish.
  to: 'attacker@evil.example', recipients: 'attacker@evil.example',
  secretField: 'should be dropped',
}), env);

console.log('\n[1] valid contact submission -> ' + res.status + ' ' + (res.headers.get('Location') || ''));
const req = captured[0] || { init: { headers: {} } };
const body = req.init.body ? JSON.parse(req.init.body) : {};
console.log('    endpoint: ' + req.url);
console.log('    from:     ' + body.from);
console.log('    to:       ' + JSON.stringify(body.to));
console.log('    reply_to: ' + body.reply_to);

check('redirects to the thank-you page', res.status === 303 && (res.headers.get('Location') || '').startsWith('/thank-you'), res.status);
check('exactly one outbound request', captured.length === 1, captured.length);
check('hits the Resend endpoint', req.url === 'https://api.resend.com/emails', req.url);
check('Bearer auth header', (req.init.headers || {})['Authorization'] === 'Bearer ' + env.RESEND_API_KEY, 'missing or wrong');
check('from is "Name <addr>" on the verified domain', body.from === 'RacFit Website <contact@goracfit.com>', body.from);
check('recipient comes from the registry, not the request', JSON.stringify(body.to) === '["info@goracfit.com"]', JSON.stringify(body.to));
check('no attacker address anywhere in the payload', !JSON.stringify(body).includes('evil.example'), 'OPEN RELAY');
check('reply_to is the submitter', body.reply_to === 'visitor@example.com', body.reply_to);
check('unregistered field dropped', !JSON.stringify(body).includes('should be dropped'), 'leaked into the email');
check('carries both text and html parts', !!body.text && !!body.html, 'missing a part');

/* 2 ------------------------------------------- missing required fields */
captured.length = 0;
res = await worker.fetch(post('/api/contact', { firstName: 'Test' }), env);
console.log('\n[2] missing required fields -> ' + res.status);
check('rejected and nothing sent', res.status >= 400 && captured.length === 0, res.status + ' / ' + captured.length + ' sends');

/* 3 ------------------------------------------------------- honeypot */
captured.length = 0;
res = await worker.fetch(post('/api/contact', {
  firstName: 'Bot', lastName: 'Bot', email: 'bot@example.com',
  topic: 'x', message: 'y', _gotcha: 'filled in',
}), env);
console.log('\n[3] honeypot filled -> ' + res.status);
check('silently dropped, nothing sent', captured.length === 0, captured.length + ' sends');

/* 4 --------------------------------------- Turnstile must fail closed */
captured.length = 0;
res = await worker.fetch(post('/api/contact', {
  firstName: 'Test', lastName: 'Person', email: 'v@example.com', topic: 'x', message: 'y',
}), { RESEND_API_KEY: 're_TEST' });   // no TURNSTILE_SECRET, no ALLOW_UNVERIFIED
console.log('\n[4] no TURNSTILE_SECRET -> ' + res.status);
check('fails closed with 503, nothing sent', res.status === 503 && captured.length === 0, res.status);

/* 5 -------------------------------------------- no mail key configured */
res = await worker.fetch(post('/api/contact', {
  firstName: 'Test', lastName: 'Person', email: 'v@example.com', topic: 'x', message: 'y',
}), { ALLOW_UNVERIFIED: 'true' });
console.log('\n[5] no RESEND_API_KEY -> ' + res.status);
check('503 rather than a crash', res.status === 503, res.status);

/* 6 ------------------------------------------------------- routing */
console.log('\n[6] routing');
for (const key of ['contact', 'tour', 'corporate-events', 'corporate-memberships',
                   'camp-interest', 'birthday-party', 'careers']) {
  const r = await worker.fetch(new Request('https://goracfit.com/api/' + key, { method: 'GET' }), env);
  // 405 proves the route matched; 404 would mean the endpoint does not exist.
  check('/api/' + key + ' routes (405 on GET, not 404)', r.status === 405, r.status);
}
const unknown = await worker.fetch(new Request('https://goracfit.com/api/not-a-form', { method: 'POST' }), env);
check('an unknown form is not accepted', unknown.status !== 303, unknown.status);

rmSync(dir, { recursive: true, force: true });
console.log(failed === 0 ? '\nALL CHECKS PASSED' : '\n' + failed + ' CHECK(S) FAILED');
process.exit(failed ? 1 : 0);
