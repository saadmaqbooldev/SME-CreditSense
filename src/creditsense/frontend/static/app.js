// Shared helpers for every CreditSense page. Vanilla JS, no framework, no build step
// (FRONTEND_REQUIREMENTS.md §6) -- every page includes this file and theme.css directly.
//
// The visual vocabulary lives in theme.css as semantic classes (.card, .badge-ok,
// .stage-running, ...). Nothing here hard-codes a colour, so re-theming never means
// editing JavaScript.

const CS = (() => {
  async function fetchJSON(url, options) {
    let res;
    try {
      res = await fetch(url, options);
    } catch (err) {
      throw new Error("Network error: could not reach the server.");
    }
    let body = null;
    try {
      body = await res.json();
    } catch (err) {
      // no/invalid JSON body -- fall through, body stays null
    }
    if (!res.ok) {
      const detail = (body && body.detail) || `${res.status} ${res.statusText}`;
      const err = new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      err.status = res.status;
      throw err;
    }
    return body;
  }

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "style") node.style.cssText = v;
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
    }
    return node;
  }

  // Staggered entrance for a list. The index is capped at 12 so a 200-row audit trail
  // still finishes animating in well under a second -- an animation must never be the
  // reason a row is invisible.
  function rise(node, index) {
    node.classList.add("rise");
    node.style.setProperty("--i", String(Math.min(index || 0, 12)));
    return node;
  }

  function skeleton(lines = 3) {
    const wrap = el("div", { class: "skel-wrap", "aria-busy": "true", "aria-live": "polite" });
    wrap.appendChild(el("span", { class: "sr-only" }, "Loading…"));
    for (let i = 0; i < lines; i++) {
      // Ragged widths read as loading content rather than as a stalled grey block.
      const w = [100, 92, 84, 96, 78][i % 5];
      wrap.appendChild(el("div", { class: "skel", style: `width:${w}%` }));
    }
    return wrap;
  }

  function emptyState(message, icon = "◍") {
    return el(
      "div",
      { class: "empty fade" },
      el("span", { class: "empty-icon", "aria-hidden": "true" }, icon),
      message
    );
  }

  function errorState(message) {
    return el(
      "div",
      { class: "alert alert-bad fade", role: "alert" },
      el("span", { class: "alert-icon", "aria-hidden": "true" }, "⚠"),
      el("span", {}, message)
    );
  }

  // Never rely on colour alone (FRONTEND_REQUIREMENTS.md §3.1) -- every badge pairs an
  // icon, a text label, and a colour.
  const VERDICTS = {
    APPROVE: { label: "Approve", icon: "✓", cls: "badge-ok" },
    DECLINE: { label: "Decline", icon: "✕", cls: "badge-bad" },
    ESCALATE_TO_HUMAN: { label: "Needs you", icon: "✋", cls: "badge-warn" },
  };

  function verdictBadge(decision, opts) {
    const v = VERDICTS[decision] || { label: decision, icon: "?", cls: "" };
    const big = opts && opts.big;
    return el(
      "span",
      { class: `badge ${v.cls} ${big ? `badge-lg verdict-${decision}` : ""}` },
      el("span", { class: "badge-icon", "aria-hidden": "true" }, v.icon),
      el("span", {}, v.label)
    );
  }

  const SOURCE_BADGES = {
    document: { label: "From document", icon: "▤", cls: "badge-info" },
    applicant_record: { label: "Bank record", icon: "▦", cls: "badge-solid" },
    derived: { label: "Derived", icon: "ƒ", cls: "badge-violet" },
  };

  function sourceBadge(source) {
    const b = SOURCE_BADGES[source] || { label: source || "—", icon: "·", cls: "" };
    return el("span", { class: `badge ${b.cls}` },
      el("span", { "aria-hidden": "true" }, b.icon), el("span", {}, b.label));
  }

  function unresolvedBadge() {
    return el("span", { class: "badge badge-warn" },
      el("span", { "aria-hidden": "true" }, "!"), el("span", {}, "Unresolved"));
  }

  function originBadge(origin) {
    return origin === "deterministic"
      ? el("span", { class: "badge badge-solid" },
          el("span", { "aria-hidden": "true" }, "§"), el("span", {}, "Rule check"))
      : el("span", { class: "badge badge-info" },
          el("span", { "aria-hidden": "true" }, "✦"), el("span", {}, "AI-assisted"));
  }

  function provenanceBadge(provenance) {
    return provenance === "real_sbp_regulation"
      ? el("span", { class: "badge badge-teal" },
          el("span", { "aria-hidden": "true" }, "★"), el("span", {}, "Real SBP regulation"))
      : el("span", { class: "badge badge-solid" },
          el("span", { "aria-hidden": "true" }, "◇"), el("span", {}, "Simulated internal policy"));
  }

  function card(title, body, extraClass = "") {
    return el("section", { class: `card ${extraClass}` },
      title ? el("div", { class: "card-hd" },
        el("span", { class: "dot", "aria-hidden": "true" }),
        el("h2", { class: "h2" }, title)) : null,
      el("div", { class: "card-pad" }, body)
    );
  }

  function statTile(label, value, sub) {
    return el("div", { class: "card stat" },
      el("div", { class: "stat-label" }, label),
      el("div", { class: "stat-value" }, value),
      sub ? el("div", { class: "stat-sub" }, sub) : null
    );
  }

  function fmtPKR(n) {
    if (n === null || n === undefined) return "—";
    return "PKR " + Number(n).toLocaleString("en-PK", { maximumFractionDigits: 0 });
  }

  // Short form for stat tiles, where "PKR 1,284,000,000" would wrap three times.
  function fmtPKRShort(n) {
    if (n === null || n === undefined) return "—";
    const v = Number(n);
    const units = [[1e9, "B"], [1e6, "M"], [1e3, "K"]];
    for (const [div, suffix] of units) {
      if (Math.abs(v) >= div) return "PKR " + (v / div).toFixed(v / div >= 100 ? 0 : 1) + suffix;
    }
    return "PKR " + v.toLocaleString("en-PK", { maximumFractionDigits: 0 });
  }

  function fmtDate(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch (e) {
      return iso;
    }
  }

  const REDUCED_MOTION = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  // Counts a number up on first paint. With motion reduced it writes the final value
  // immediately, so the number is never a moving target for anyone who asked for calm.
  function countUp(node, to, format = (v) => String(Math.round(v))) {
    if (REDUCED_MOTION.matches || !Number.isFinite(to)) {
      node.textContent = format(to);
      return;
    }
    const duration = 850;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = format(to * eased);
      if (t < 1) requestAnimationFrame(frame);
      else node.textContent = format(to);
    }
    requestAnimationFrame(frame);
  }

  // Animates a .bar-fill / .gauge-needle from its start value to its real one on the
  // next frame, so the CSS width/left transition has something to transition from.
  function animateTo(node, prop, value) {
    if (REDUCED_MOTION.matches) { node.style[prop] = value; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => { node.style[prop] = value; }));
  }

  // ---- toast / dialog -------------------------------------------------------
  // These replace window.alert/confirm/prompt: same flow, but styled, dismissible
  // with Escape, focus-trapped to the dialog's own buttons, and announced to a
  // screen reader instead of blocking the page.

  function toastHost() {
    let host = document.getElementById("cs-toast-host");
    if (!host) {
      host = el("div", { id: "cs-toast-host", class: "toast-host", role: "status", "aria-live": "polite" });
      document.body.appendChild(host);
    }
    return host;
  }

  const TOAST_ICONS = { ok: "✓", bad: "⚠", warn: "!", info: "i" };

  function toast(message, kind = "info", ms = 4200) {
    const node = el("div", { class: `toast toast-${kind}` },
      el("span", { class: "alert-icon", "aria-hidden": "true" }, TOAST_ICONS[kind] || "i"),
      el("span", {}, message)
    );
    toastHost().appendChild(node);
    setTimeout(() => {
      node.classList.add("out");
      setTimeout(() => node.remove(), 260);
    }, ms);
    return node;
  }

  // Resolves to true/false (confirm) or to the entered string/null (prompt).
  function dialog({ title, body, input, confirmLabel = "Confirm", cancelLabel = "Cancel", kind = "primary", validate }) {
    return new Promise((resolve) => {
      const previouslyFocused = document.activeElement;
      const errEl = el("div", { class: "hint", style: "color:var(--bad-fg)" });
      const field = input
        ? el("textarea", { class: "textarea", rows: 3, placeholder: input.placeholder || "", "aria-label": input.label || title })
        : null;

      function close(result) {
        document.removeEventListener("keydown", onKey, true);
        host.remove();
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
        resolve(result);
      }

      const confirmBtn = el("button", {
        class: `btn ${kind === "ok" ? "btn-ok" : "btn-primary"}`,
        onclick: () => {
          const value = field ? field.value : true;
          if (validate) {
            const problem = validate(field ? field.value : null);
            if (problem) { errEl.textContent = problem; field && field.focus(); return; }
          }
          close(value);
        },
      }, confirmLabel);

      const cancelBtn = el("button", { class: "btn", onclick: () => close(field ? null : false) }, cancelLabel);

      const box = el("div", {
        class: "dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "cs-dialog-title",
      },
        el("h2", { class: "h2", id: "cs-dialog-title", style: "font-size:1.05rem" }, title),
        body ? el("p", { class: "lede", style: "margin:.5rem 0 0" }, body) : null,
        field ? el("div", { style: "margin-top:.8rem" }, field, errEl) : null,
        el("div", { style: "display:flex;gap:.5rem;margin-top:1.1rem;justify-content:flex-end" }, cancelBtn, confirmBtn)
      );

      const host = el("div", {
        class: "dialog-host",
        onclick: (e) => { if (e.target === host) close(field ? null : false); },
      }, box);

      // Escape closes; Tab cycles only between the dialog's own focusables.
      function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); close(field ? null : false); return; }
        if (e.key !== "Tab") return;
        const focusables = box.querySelectorAll("button, textarea, input, a[href]");
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
      document.addEventListener("keydown", onKey, true);

      document.body.appendChild(host);
      (field || confirmBtn).focus();
    });
  }

  const confirmDialog = (title, body, opts = {}) =>
    dialog({ title, body, confirmLabel: opts.confirmLabel || "Confirm", kind: opts.kind });

  const promptDialog = (title, body, opts = {}) =>
    dialog({ title, body, input: { placeholder: opts.placeholder, label: opts.label }, confirmLabel: opts.confirmLabel || "Submit", validate: opts.validate });

  return {
    fetchJSON, el, rise, skeleton, emptyState, errorState, card, statTile,
    verdictBadge, sourceBadge, unresolvedBadge, originBadge, provenanceBadge,
    fmtPKR, fmtPKRShort, fmtDate, countUp, animateTo,
    toast, dialog, confirmDialog, promptDialog, REDUCED_MOTION,
  };
})();
