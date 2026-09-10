var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// dist/worker/index.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
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
var onRequestPost = /* @__PURE__ */ __name2(async ({ request, env, params }) => {
  const form = FORMS[params.form];
  if (!form) return new Response("Not found", { status: 404 });
  let body;
  try {
    body = await request.formData();
  } catch {
    return errorPage("We could not read that submission.");
  }
  if ((body.get("_gotcha") || "").trim() !== "") return seeOther(params.form);
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
  await archive(env, params.form, values, request);
  return seeOther(params.form);
}, "onRequestPost");
var onRequestGet = /* @__PURE__ */ __name2(() => new Response("This endpoint accepts POST only.", {
  status: 405,
  headers: { "Allow": "POST", "Content-Type": "text/plain; charset=utf-8" }
}), "onRequestGet");
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
__name2(validate, "validate");
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
__name2(verifyTurnstile, "verifyTurnstile");
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
__name2(send, "send");
function asText(form, values, request) {
  const lines = Object.values(values).map((f) => f.label + ": " + f.value);
  lines.push("", "Form: " + form.subject, "Submitted: " + (/* @__PURE__ */ new Date()).toISOString());
  const country = request.cf && request.cf.country;
  if (country) lines.push("Country: " + country);
  return lines.join("\n");
}
__name(asText, "asText");
__name2(asText, "asText");
function asHtml(form, values, request) {
  const rows = Object.values(values).map(
    (f) => '<tr><td style="padding:6px 16px 6px 0;color:#5b6470;vertical-align:top;white-space:nowrap">' + esc(f.label) + '</td><td style="padding:6px 0;color:#102748">' + esc(f.value).replace(/\n/g, "<br>") + "</td></tr>"
  ).join("");
  const country = request.cf && request.cf.country || "";
  return '<div style="font:15px/1.55 -apple-system,Segoe UI,Roboto,sans-serif;color:#102748"><p style="margin:0 0 14px"><strong>' + esc(form.subject) + "</strong> from " + esc(SITE.name) + '</p><table style="border-collapse:collapse">' + rows + '</table><p style="margin:18px 0 0;font-size:13px;color:#5b6470">Submitted ' + esc((/* @__PURE__ */ new Date()).toISOString()) + (country ? " &middot; " + esc(country) : "") + ". Reply directly to this email to reach the sender.</p></div>";
}
__name(asHtml, "asHtml");
__name2(asHtml, "asHtml");
var esc = /* @__PURE__ */ __name2((s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"), "esc");
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
__name2(archive, "archive");
var seeOther = /* @__PURE__ */ __name2((formKey) => new Response(null, {
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
__name2(errorPage, "errorPage");
var routes = [
  {
    routePath: "/api/:form",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/:form",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  }
];
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
__name2(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

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

// .wrangler/tmp/bundle-ffEs9E/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

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

// .wrangler/tmp/bundle-ffEs9E/middleware-loader.entry.ts
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
