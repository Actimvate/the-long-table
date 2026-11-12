(function () {
  "use strict";

  var SITE = {
    email: "thelongtablebookclub@gmail.com",
    // Book submissions are delivered to this inbox by FormSubmit (free, no account).
    // The first submission sends a one-time "Activate form" email to this address.
    submissionsTo: "admin@actimvated.com",
    formEndpoint: "https://formsubmit.co/ajax/admin@actimvated.com"
  };
  var CURRENCY_SYMBOL = "$";
  var FUEL_TIERS = {
    5: "Tea, coffee and something small for one open-day table. The house opens twice a week; this keeps one of them sweet.",
    15: "Refreshments for one corner of a full-house sitting, roughly a dozen readers and their second cups.",
    40: "Everything for one full-house sitting of about seventy readers: tea, coffee, biscuits, fruit, and the room that holds us."
  };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clip(s, n) { return s.length > n ? s.slice(0, n) + "…" : s; }
  function money(n) { return CURRENCY_SYMBOL + Number(n).toLocaleString("en-US"); }

  /* ---------- Header ---------- */
  var header = $("#site-header");
  var toggle = $(".menu-toggle");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  if (toggle && header) {
    var setMenu = function (open) {
      header.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    toggle.addEventListener("click", function () { setMenu(!header.classList.contains("menu-open")); });
    $all(".mobile-nav a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  /* ---------- Field errors ---------- */
  function setErrors(form, errors) {
    $all(".field", form).forEach(function (f) {
      f.classList.remove("has-error");
      var old = $(".field__error", f); if (old) old.remove();
      var input = $("input,select,textarea", f); if (input) input.removeAttribute("aria-invalid");
    });
    Object.keys(errors).forEach(function (name) {
      var input = form.elements[name]; if (!input) return;
      var field = input.closest(".field"); if (!field) return;
      field.classList.add("has-error");
      input.setAttribute("aria-invalid", "true");
      var p = document.createElement("p");
      p.className = "field__error"; p.id = input.id + "-error"; p.textContent = errors[name];
      input.setAttribute("aria-describedby", p.id);
      field.appendChild(p);
    });
    var first = Object.keys(errors)[0];
    if (first && form.elements[first]) form.elements[first].focus();
  }
  function showError(form, msg) {
    var el = $('[data-role="error"]', form);
    if (!el) return;
    el.textContent = msg || ""; el.hidden = !msg;
  }

  /* ---------- Book submission ---------- */
  var sForm = $("#submit-form");
  var sDone = $("#submit-done");
  if (sForm && sDone) {
    var sRetry = $('[data-role="retry-link"]', sDone);
    sForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(sForm);
      var d = {
        name: String(fd.get("name") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        bookTitle: String(fd.get("bookTitle") || "").trim(),
        genre: String(fd.get("genre") || ""),
        format: String(fd.get("format") || ""),
        link: String(fd.get("link") || "").trim(),
        note: String(fd.get("note") || "").trim()
      };
      var err = {};
      if (d.name.length < 2) err.name = "Tell us who to reply to.";
      if (!EMAIL_RE.test(d.email)) err.email = "A working email, please. We reply to everything.";
      if (!d.bookTitle) err.bookTitle = "Which book is it?";
      if (!d.genre) err.genre = "Pick the closest fit.";
      if (!d.format) err.format = "Print, ebook or audio?";
      if (d.link && !/^https?:\/\/.+\..+/.test(d.link)) err.link = "Full link, including https://";
      setErrors(sForm, err);
      if (Object.keys(err).length) return;
      showError(sForm, "");

      var subject = "Book submission — " + clip(d.bookTitle, 120);
      var body = [
        "Name: " + d.name, "Email: " + d.email, "Book title: " + d.bookTitle,
        "Genre: " + d.genre, "Format: " + d.format,
        d.link ? "Where to find it: " + d.link : "",
        d.note ? "Anything we should know: " + clip(d.note, 600) : "",
        "", "— sent from thelongtablebookclub website"
      ].filter(Boolean).join("\n");
      var mailto = "mailto:" + SITE.submissionsTo + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      if (sRetry) sRetry.href = mailto;

      var done = function (viaEmailApp) {
        $('[data-role="mail-clause"]', sDone).hidden = !viaEmailApp;
        $('[data-role="retry"]', sDone).hidden = !viaEmailApp;
        sForm.hidden = true; sDone.hidden = false; sForm.reset();
      };
      var openEmailApp = function () { window.location.href = mailto; done(true); };

      if (!SITE.formEndpoint) { openEmailApp(); return; }

      var btn = $('button[type="submit"]', sForm);
      btn.disabled = true; btn.textContent = "Sending…";
      fetch(SITE.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: subject, _template: "table", _captcha: "false", _replyto: d.email,
          "Name": d.name, "Email": d.email, "Book title": d.bookTitle, "Genre": d.genre, "Format": d.format,
          "Where to find it": d.link || "-", "Anything we should know": d.note || "-"
        })
      })
        .then(function (r) { return r.json().catch(function () { return null; }).then(function (t) {
          if (!r.ok || !t || String(t.success) !== "true") throw new Error("not delivered");
          done(false);
        }); })
        .catch(function () { openEmailApp(); })
        .then(function () { btn.disabled = false; btn.textContent = "Submit for consideration"; });
    });
    $('[data-role="again"]', sDone).addEventListener("click", function () { sDone.hidden = true; sForm.hidden = false; });
  }

  /* ---------- Pledge (checkout on Selar, in USD) ---------- */
  var pForm = $("#pledge-form");
  if (pForm) {
    var state = { kind: "pledge", tier: 5 };
    var tierBody = $('[data-role="tier-body"]', pForm);
    var submitBtn = $('[data-role="submit"]', pForm);
    var render = function () {
      $all("[data-kind]", pForm).forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.kind === state.kind)); });
      $all("[data-amount]", pForm).forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.amount) === state.tier)); });
      tierBody.textContent = FUEL_TIERS[state.tier];
      submitBtn.textContent = state.kind === "donation" ? "Donate " + money(state.tier) : "Pledge " + money(state.tier) + " of refreshments";
    };
    $all("[data-kind]", pForm).forEach(function (b) { b.addEventListener("click", function () { state.kind = b.dataset.kind; render(); }); });
    $all("[data-amount]", pForm).forEach(function (b) { b.addEventListener("click", function () { state.tier = Number(b.dataset.amount); render(); }); });
    render();
  }
})();
