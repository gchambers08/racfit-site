/**
 * Static-site form handler for Cloudflare Pages Functions.
 * Route: POST /api/<form>   e.g. /api/contact, /api/tour
 *
 * Deliberately one self-contained file with no imports, so porting it to
 * another site is: copy this file, rewrite the CONFIG block, done.
 *
 * Required Pages environment variables (Settings > Environment variables):
 *   SPARKPOST_API_KEY    secret. Needs only the "Transmissions: Read/Write" grant.
 *   TURNSTILE_SECRET     secret. From the Turnstile widget.
 *
 * Optional:
 *   SPARKPOST_BASE       https://api.eu.sparkpost.com for an EU account.
 *   ALLOW_UNVERIFIED     "true" lets forms work before Turnstile exists.
 *                        Never set this in production - see verifyTurnstile().
 *   SUBMISSIONS          KV namespace binding. If bound, every submission is
 *                        archived. If absent, this is skipped silently.
 *
 * Security notes, because this is the part that goes wrong:
 *   - Recipients come from the FORMS registry below and NEVER from the request.
 *     A form endpoint that mails a submitter-supplied address is an open relay;
 *     it gets found, used for phishing, and burns the sending domain.
 *   - reply_to is the submitter's address, but only after it validates as an
 *     email, and it is never used as a recipient.
 *   - Only fields named in the registry are read. Anything else is dropped, so
 *     an attacker cannot inject extra content by adding inputs.
 *   - Every value is escaped before it enters the HTML body.
 */

/* ========================================================================
   CONFIG - the per-site part
   ======================================================================== */

const SITE = {
  name: 'RacFit',
  origin: 'https://goracfit.com',
  // Must be on a domain verified in SparkPost. This is the apex, so SparkPost's
  // DKIM and SPF go on goracfit.com itself - the same domain staff mail runs on.
  // See FORMS.md before touching the SPF record.
  from: { email: 'contact@goracfit.com', name: 'RacFit Website' },
  thankYou: '/thank-you',
  phone: '512-221-1926',
};

const TEXT = 60, LONG = 4000;

const FORMS = {
  'contact': {
    to: 'info@goracfit.com',
    subject: 'Website enquiry',
    fields: {
      firstName: { label: 'First Name', required: true, max: TEXT },
      lastName:  { label: 'Last Name',  required: true, max: TEXT },
      email:     { label: 'Email Address', required: true, email: true },
      topic:     { label: 'What Is This About?', required: true, max: TEXT },
      message:   { label: 'Message', required: true, max: LONG },
    },
  },
  'tour': {
    to: 'contact@goracfit.com',
    subject: 'Tour request',
    fields: {
      name:     { label: 'Name', required: true, max: TEXT },
      email:    { label: 'Email Address', required: true, email: true },
      phone:    { label: 'Phone Number', max: TEXT },
      party:    { label: 'How Many People?', max: TEXT },
      interest: { label: 'Most Interested In', max: TEXT },
      when:     { label: 'When Works?', max: TEXT },
      message:  { label: 'Anything Else?', max: LONG },
    },
  },
  'corporate-events': {
    to: 'contact@goracfit.com',
    subject: 'Corporate event enquiry',
    fields: {
      name:         { label: 'Name', required: true, max: TEXT },
      company:      { label: 'Company', max: TEXT },
      email:        { label: 'Email Address', required: true, email: true },
      phone:        { label: 'Phone Number', max: TEXT },
      eventType:    { label: 'Event Type', max: TEXT },
      guests:       { label: 'Guest Count', max: TEXT },
      dates:        { label: 'Dates in Mind', max: TEXT },
      foodBeverage: { label: 'Food & Beverage', max: TEXT },
      message:      { label: 'Anything Else?', max: LONG },
    },
  },
  'corporate-memberships': {
    to: 'michelle@goracfit.com',
    subject: 'Corporate membership enquiry',
    fields: {
      name:     { label: 'Name', required: true, max: TEXT },
      company:  { label: 'Company', required: true, max: TEXT },
      email:    { label: 'Email Address', required: true, email: true },
      phone:    { label: 'Phone Number', max: TEXT },
      teamSize: { label: 'Team Size', max: TEXT },
      interest: { label: 'Most Interested In', max: TEXT },
      message:  { label: 'Anything Else?', max: LONG },
    },
  },
  'camp-interest': {
    to: 'contact@goracfit.com',
    subject: 'Camp interest',
    fields: {
      name:      { label: 'Parent / Guardian Name', required: true, max: TEXT },
      email:     { label: 'Email Address', required: true, email: true },
      phone:     { label: 'Phone Number', max: TEXT },
      camp:      { label: 'Which Camp?', max: TEXT },
      ages:      { label: 'Child Age(s)', max: TEXT },
      dayLength: { label: 'Full Day or Half Day?', max: TEXT },
      notes:     { label: 'Anything Else?', max: LONG },
    },
  },
  'birthday-party': {
    to: 'contact@goracfit.com',
    subject: 'Birthday party enquiry',
    fields: {
      name:      { label: 'Parent / Guardian Name', required: true, max: TEXT },
      email:     { label: 'Email Address', required: true, email: true },
      phone:     { label: 'Phone Number', max: TEXT },
      childAge:  { label: 'Birthday Child Age', max: TEXT },
      guests:    { label: 'How Many Guests?', max: TEXT },
      preferred: { label: 'Preferred Date', max: TEXT },
      activity:  { label: 'Main Activity', max: TEXT },
      notes:     { label: 'Anything Else?', max: LONG },
    },
  },
  'careers': {
    to: 'contact@goracfit.com',
    subject: 'Job application',
    fields: {
      name:       { label: 'Name', required: true, max: TEXT },
      email:      { label: 'Email Address', required: true, email: true },
      phone:      { label: 'Phone Number', max: TEXT },
      role:       { label: 'Role Applying For', required: true, max: TEXT },
      experience: { label: 'Relevant Experience', max: LONG },
      available:  { label: 'Availability', max: TEXT },
      certs:      { label: 'Certifications', max: TEXT },
      notes:      { label: 'Anything Else?', max: LONG },
    },
  },
};

/* ========================================================================
   HANDLER
   ======================================================================== */

export const onRequestPost = async ({ request, env, params }) => {
  const form = FORMS[params.form];
  if (!form) return new Response('Not found', { status: 404 });

  let body;
  try {
    body = await request.formData();
  } catch {
    return errorPage('We could not read that submission.');
  }

  // Honeypot. A real browser leaves it empty; most bots fill every field.
  // Answer as though it succeeded so the bot learns nothing.
  if ((body.get('_gotcha') || '').trim() !== '') return seeOther(params.form);

  const captcha = await verifyTurnstile(env, body.get('cf-turnstile-response'), request);
  if (captcha !== true) return captcha;

  const { values, problems } = validate(form, body);
  if (problems.length) return errorPage(problems.join(' '));

  const replyTo = values.email && values.email.value;
  const who = (values.name && values.name.value)
    || [values.firstName && values.firstName.value,
        values.lastName && values.lastName.value].filter(Boolean).join(' ')
    || 'website visitor';

  const sent = await send(env, {
    to: form.to,                                   // registry only, never input
    replyTo,
    subject: form.subject + ' - ' + who,
    text: asText(form, values, request),
    html: asHtml(form, values, request),
  });
  if (sent !== true) return sent;

  await archive(env, params.form, values, request);
  return seeOther(params.form);
};

// A GET on a form endpoint is someone poking at it, or a mistyped action.
export const onRequestGet = () =>
  new Response('This endpoint accepts POST only.', {
    status: 405,
    headers: { 'Allow': 'POST', 'Content-Type': 'text/plain; charset=utf-8' },
  });

/* ========================================================================
   VALIDATION
   ======================================================================== */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

function validate(form, body) {
  const values = {}, problems = [];
  for (const [name, spec] of Object.entries(form.fields)) {
    let v = body.get(name);
    v = typeof v === 'string' ? v.trim() : '';
    if (!v) {
      if (spec.required) problems.push(spec.label + ' is required.');
      continue;
    }
    if (v.length > (spec.max || TEXT)) {
      problems.push(spec.label + ' is too long.');
      continue;
    }
    if (spec.email && !EMAIL.test(v)) {
      problems.push(spec.label + ' does not look like an email address.');
      continue;
    }
    // Drop control characters so nothing can forge header-like lines. Tabs and
    // newlines survive, because a message field legitimately contains them.
    values[name] = { label: spec.label, value: v.replace(CONTROL, '') };
  }
  return { values, problems };
}

/* ========================================================================
   TURNSTILE
   ======================================================================== */

async function verifyTurnstile(env, token, request) {
  if (!env.TURNSTILE_SECRET) {
    // Fails CLOSED on purpose. An unprotected public mail endpoint gets abused
    // within days. ALLOW_UNVERIFIED exists only so forms can be tested before
    // the Turnstile widget is created - it must never be set in production.
    if (env.ALLOW_UNVERIFIED === 'true') return true;
    return errorPage('This form is not fully configured yet.', 503);
  }
  if (!token) return errorPage('Please complete the spam check and try again.');

  const fd = new FormData();
  fd.append('secret', env.TURNSTILE_SECRET);
  fd.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) fd.append('remoteip', ip);

  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: fd });
    const out = await r.json();
    if (out.success) return true;
  } catch { /* fall through to the generic failure below */ }
  return errorPage('That spam check did not pass. Please try again.');
}

/* ========================================================================
   EMAIL
   ======================================================================== */

async function send(env, msg) {
  if (!env.SPARKPOST_API_KEY) return errorPage('Email is not configured yet.', 503);
  const base = env.SPARKPOST_BASE || 'https://api.sparkpost.com';

  const payload = {
    options: { transactional: true },
    recipients: [{ address: { email: msg.to } }],
    content: {
      from: SITE.from,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    },
  };
  if (msg.replyTo) payload.content.reply_to = msg.replyTo;

  try {
    const r = await fetch(base + '/api/v1/transmissions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.SPARKPOST_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (r.ok) return true;
    // Log the status only - never the key, never the visitor's details.
    console.error('sparkpost rejected the send', r.status);
  } catch (e) {
    console.error('sparkpost unreachable', e && e.message);
  }
  return errorPage(
    'We could not send that just now. Please try again, or call us on ' + SITE.phone + '.',
    502);
}

function asText(form, values, request) {
  const lines = Object.values(values).map(f => f.label + ': ' + f.value);
  lines.push('', 'Form: ' + form.subject, 'Submitted: ' + new Date().toISOString());
  const country = request.cf && request.cf.country;
  if (country) lines.push('Country: ' + country);
  return lines.join('\n');
}

function asHtml(form, values, request) {
  const rows = Object.values(values).map(f =>
    '<tr><td style="padding:6px 16px 6px 0;color:#5b6470;vertical-align:top;white-space:nowrap">'
    + esc(f.label) + '</td><td style="padding:6px 0;color:#102748">'
    + esc(f.value).replace(/\n/g, '<br>') + '</td></tr>'
  ).join('');
  const country = (request.cf && request.cf.country) || '';
  return '<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#102748">'
    + '<p style="margin:0 0 14px"><strong>' + esc(form.subject) + '</strong> from '
    + esc(SITE.name) + '</p><table style="border-collapse:collapse">' + rows + '</table>'
    + '<p style="margin:18px 0 0;font-size:13px;color:#5b6470">Submitted '
    + esc(new Date().toISOString()) + (country ? ' &middot; ' + esc(country) : '')
    + '. Reply directly to this email to reach the sender.</p></div>';
}

const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/* ========================================================================
   ARCHIVE (optional)
   ======================================================================== */

async function archive(env, formKey, values, request) {
  if (!env.SUBMISSIONS) return;            // KV not bound; nothing to do
  try {
    const key = formKey + '/' + new Date().toISOString() + '-' + crypto.randomUUID();
    const record = {
      form: formKey,
      at: new Date().toISOString(),
      country: (request.cf && request.cf.country) || null,
      fields: Object.fromEntries(
        Object.entries(values).map(([k, f]) => [k, f.value])),
    };
    await env.SUBMISSIONS.put(key, JSON.stringify(record));
  } catch (e) {
    // An archive failure must never lose a submission that already emailed.
    console.error('archive failed', e && e.message);
  }
}

/* ========================================================================
   RESPONSES
   ======================================================================== */

const seeOther = formKey => new Response(null, {
  status: 303,
  headers: { Location: SITE.thankYou + '?f=' + encodeURIComponent(formKey) },
});

function errorPage(message, status = 400) {
  return new Response('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="robots" content="noindex"><title>Something went wrong | '
    + esc(SITE.name) + '</title><style>body{margin:0;background:#102748;color:#fff;'
    + 'font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;display:flex;'
    + 'min-height:100vh;align-items:center;justify-content:center;padding:24px}'
    + '.b{max-width:44ch}h1{font-size:1.5rem;margin:0 0 12px}a{color:#D9F53C}'
    + '</style></head><body><div class="b"><h1>That did not go through</h1><p>'
    + esc(message) + '</p><p><a href="' + esc(SITE.origin)
    + '/contact">Contact us</a> or call ' + esc(SITE.phone)
    + '</p></div></body></html>',
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
