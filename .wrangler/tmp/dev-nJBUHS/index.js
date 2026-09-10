var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var SITE = {
  name: "RacFit",
  origin: "https://goracfit.com",
  // Must be on a domain verified in SparkPost. This is the apex, so SparkPost's
  // DKIM and SPF go on goracfit.com itself - the same domain staff mail runs on.
  // See FORMS.md before touching the SPF record.
  from: { email: "contact@goracfit.com", name: "RacFit Website" },
  thankYou: "/thank-you",
  phone: "512-221-1926"
};
var TEXT = 60;
var LONG = 4e3;
var FORMS = {
  "contact": {
    to: "info@goracfit.com",
    subject: "Website enquiry",
    fields: {
      firstName: { label: "First Name", required: true, max: TEXT },
      lastName: { label: "Last Name", required: true, max: TEXT },
      email: { label: "Email Address", required: true, email: true },
      topic: { label: "What Is This About?", required: true, max: TEXT },
      message: { label: "Message", required: true, max: LONG }
    }
  },
  "tour": {
    to: "contact@goracfit.com",
    subject: "Tour request",
    fields: {
      name: { label: "Name", required: true, max: TEXT },
      email: { label: "Email Address", required: true, email: true },
      phone: { label: "Phone Number", max: TEXT },
      party: { label: "How Many People?", max: TEXT },
      interest: { label: "Most Interested In", max: TEXT },
      when: { label: "When Works?", max: TEXT },
      message: { label: "Anything Else?", max: LONG }
    }
  },
  "corporate-events": {
    to: "contact@goracfit.com",
    subject: "Corporate event enquiry",
    fields: {
      name: { label: "Name", required: true, max: TEXT },
      company: { label: "Company", max: TEXT },
      email: { label: "Email Address", required: true, email: true },
      phone: { label: "Phone Number", max: TEXT },
      eventType: { label: "Event Type", max: TEXT },
      guests: { label: "Guest Count", max: TEXT },
      dates: { label: "Dates in Mind", max: TEXT },
      foodBeverage: { label: "Food & Beverage", max: TEXT },
      message: { label: "Anything Else?", max: LONG }
    }
  },
  "corporate-memberships": {
    to: "michelle@goracfit.com",
    subject: "Corporate membership enquiry",
    fields: {
      name: { label: "Name", required: true, max: TEXT },
      company: { label: "Company", required: true, max: TEXT },
      email: { label: "Email Address", required: true, email: true },
      phone: { label: "Phone Number", max: TEXT },
      teamSize: { label: "Team Size", max: TEXT },
      interest: { label: "Most Interested In", max: TEXT },
      message: { label: "Anything Else?", max: LONG }
    }
  },
  "camp-interest": {
    to: "contact@goracfit.com",
    subject: "Camp interest",
    fields: {
      name: { label: "Parent / Guardian Name", required: true, max: TEXT },
      email: { label: "Email Address", required: true, email: true },
      phone: { label: "Phone Number", max: TEXT },
      camp: { label: "Which Camp?", max: TEXT },
      ages: { label: "Child Age(s)", max: TEXT },
      dayLength: { label: "Full Day or Half Day?", max: TEXT },
      notes: { label: "Anything Else?", max: LONG }
    }
  },
  "birthday-party": {
    to: "contact@goracfit.com",
    subject: "Birthday party enquiry",
    fields: {
      name: { label: "Parent / Guardian Name", required: true, max: TEXT },
      email: { label: "Email Address", required: true, email: true },
      phone: { label: "Phone Number", max: TEXT },
      childAge: { label: "Birthday Child Age", max: TEXT },
      guests: { label: "How Many Guests?", max: TEXT },
      preferred: { label: "Preferred Date", max: TEXT },
      activity: { label: "Main Activity", max: TEXT },
      notes: { label: "Anything Else?", max: LONG }
    }
  },
  "careers": {
    to: "contact@goracfit.com",
    subject: "Job application",
    fields: {
      name: { label: "Name", required: true, max: TEXT },
      email: { label: "Email Address", required: true, email: true },
      phone: { label: "Phone Number", max: TEXT },
      role: { label: "Role Applying For", required: true, max: TEXT },
      experience: { label: "Relevant Experience", max: LONG },
      available: { label: "Availability", max: TEXT },
      certs: { label: "Certifications", max: TEXT },
      notes: { label: "Anything Else?", max: LONG }
    }
  }
};
async function handleSubmission(request, env, formKey) {
  const form = FORMS[formKey];
  if (!form) return new Response("Not found", { status: 404 });
  let body;
  try {
    body = await request.formData();
  } catch {
    return errorPage("We could not read that submission.");
  }
  if ((body.get("_gotcha") || "").trim() !== "") return seeOther(formKey);
  const captcha = await verifyTurnstile(env, body.get("cf-turnstile-response"), request);
  if (captcha !== true) return captcha;
  const { values, problems } = validate(form, body);
  if (problems.length) return errorPage(problems.join(" "));
  const replyTo = values.email && values.email.value;
  const who = values.name && values.name.value || [
    values.firstName && values.firstName.value,
    values.lastName && values.lastName.value
  ].filter(Boolean).join(" ") || "website visitor";
  const sent = await send(env, {
    to: form.to,
    // registry only, never input
    replyTo,
    subject: form.subject + " - " + who,
    text: asText(form, values, request),
    html: asHtml(form, values, request)
  });
  if (sent !== true) return sent;
  await archive(env, formKey, values, request);
  return seeOther(formKey);
}
__name(handleSubmission, "handleSubmission");
var src_default = {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const match = path.match(/^\/api\/([a-z][a-z0-9-]*)\/?$/);
    if (!match) return new Response("Not found", { status: 404 });
    if (request.method !== "POST") {
      return new Response("This endpoint accepts POST only.", {
        status: 405,
        headers: { "Allow": "POST", "Content-Type": "text/plain; charset=utf-8" }
      });
    }
    return handleSubmission(request, env, match[1]);
  }
};
var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
function validate(form, body) {
  const values = {}, problems = [];
  for (const [name, spec] of Object.entries(form.fields)) {
    let v = body.get(name);
    v = typeof v === "string" ? v.trim() : "";
    if (!v) {
      if (spec.required) problems.push(spec.label + " is required.");
      continue;
    }
    if (v.length > (spec.max || TEXT)) {
      problems.push(spec.label + " is too long.");
      continue;
    }
    if (spec.email && !EMAIL.test(v)) {
      problems.push(spec.label + " does not look like an email address.");
      continue;
    }
    values[name] = { label: spec.label, value: v.replace(CONTROL, "") };
  }
  return { values, problems };
}
__name(validate, "validate");
async function verifyTurnstile(env, token, request) {
  if (!env.TURNSTILE_SECRET) {
    if (env.ALLOW_UNVERIFIED === "true") return true;
    return errorPage("This form is not fully configured yet.", 503);
  }
  if (!token) return errorPage("Please complete the spam check and try again.");
  const fd = new FormData();
  fd.append("secret", env.TURNSTILE_SECRET);
  fd.append("response", token);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) fd.append("remoteip", ip);
  try {
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: fd }
    );
    const out = await r.json();
    if (out.success) return true;
  } catch {
  }
  return errorPage("That spam check did not pass. Please try again.");
}
__name(verifyTurnstile, "verifyTurnstile");
async function send(env, msg) {
  if (!env.SPARKPOST_API_KEY) return errorPage("Email is not configured yet.", 503);
  const base = env.SPARKPOST_BASE || "https://api.sparkpost.com";
  const payload = {
    options: { transactional: true },
    recipients: [{ address: { email: msg.to } }],
    content: {
      from: SITE.from,
      subject: msg.subject,
      text: msg.text,
      html: msg.html
    }
  };
  if (msg.replyTo) payload.content.reply_to = msg.replyTo;
  try {
    const r = await fetch(base + "/api/v1/transmissions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + env.SPARKPOST_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    if (r.ok) return true;
    console.error("sparkpost rejected the send", r.status);
  } catch (e) {
    console.error("sparkpost unreachable", e && e.message);
  }
  return errorPage(
    "We could not send that just now. Please try again, or call us on " + SITE.phone + ".",
    502
  );
}
__name(send, "send");
function asText(form, values, request) {
  const lines = Object.values(values).map((f) => f.label + ": " + f.value);
  lines.push("", "Form: " + form.subject, "Submitted: " + (/* @__PURE__ */ new Date()).toISOString());
  const country = request.cf && request.cf.country;
  if (country) lines.push("Country: " + country);
  return lines.join("\n");
}
__name(asText, "asText");
function asHtml(form, values, request) {
  const rows = Object.values(values).map(
    (f) => '<tr><td style="padding:6px 16px 6px 0;color:#5b6470;vertical-align:top;white-space:nowrap">' + esc(f.label) + '</td><td style="padding:6px 0;color:#102748">' + esc(f.value).replace(/\n/g, "<br>") + "</td></tr>"
  ).join("");
  const country = request.cf && request.cf.country || "";
  return '<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#102748"><p style="margin:0 0 14px"><strong>' + esc(form.subject) + "</strong> from " + esc(SITE.name) + '</p><table style="border-collapse:collapse">' + rows + '</table><p style="margin:18px 0 0;font-size:13px;color:#5b6470">Submitted ' + esc((/* @__PURE__ */ new Date()).toISOString()) + (country ? " &middot; " + esc(country) : "") + ". Reply directly to this email to reach the sender.</p></div>";
}
__name(asHtml, "asHtml");
var esc = /* @__PURE__ */ __name((s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), "esc");
async function archive(env, formKey, values, request) {
  if (!env.SUBMISSIONS) return;
  try {
    const key = formKey + "/" + (/* @__PURE__ */ new Date()).toISOString() + "-" + crypto.randomUUID();
    const record = {
      form: formKey,
      at: (/* @__PURE__ */ new Date()).toISOString(),
      country: request.cf && request.cf.country || null,
      fields: Object.fromEntries(
        Object.entries(values).map(([k, f]) => [k, f.value])
      )
    };
    await env.SUBMISSIONS.put(key, JSON.stringify(record));
  } catch (e) {
    console.error("archive failed", e && e.message);
  }
}
__name(archive, "archive");
var seeOther = /* @__PURE__ */ __name((formKey) => new Response(null, {
  status: 303,
  headers: { Location: SITE.thankYou + "?f=" + encodeURIComponent(formKey) }
}), "seeOther");
function errorPage(message, status = 400) {
  return new Response(
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Something went wrong | ' + esc(SITE.name) + '</title><style>body{margin:0;background:#102748;color:#fff;font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}.b{max-width:44ch}h1{font-size:1.5rem;margin:0 0 12px}a{color:#D9F53C}</style></head><body><div class="b"><h1>That did not go through</h1><p>' + esc(message) + '</p><p><a href="' + esc(SITE.origin) + '/contact">Contact us</a> or call ' + esc(SITE.phone) + "</p></div></body></html>",
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
__name(errorPage, "errorPage");

// ../../../.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-TluREz/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../.npm/_npx/c943b712072b77c4/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-TluREz/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
