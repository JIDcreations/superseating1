/* Superseating — site behaviour. No dependencies. */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.add("js");

  /* Header shadow once the page scrolls -------------------------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 8); };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile menu -------------------------------------------------------- */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-nav");

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", function (mq) {
      if (mq.matches) setMenu(false);
    });
  }

  /* Services dropdown -------------------------------------------------- */
  var menuButtons = document.querySelectorAll("[data-submenu]");
  var desktop = window.matchMedia("(hover: hover) and (min-width: 961px)");

  function setSubmenu(btn, open) {
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    btn.setAttribute("aria-expanded", String(open));
    if (panel) panel.classList.toggle("is-open", open);
  }

  menuButtons.forEach(function (btn) {
    var item = btn.closest(".nav-item--has-menu");
    var closeTimer;

    btn.addEventListener("click", function () {
      setSubmenu(btn, btn.getAttribute("aria-expanded") !== "true");
    });

    item.addEventListener("mouseenter", function () {
      if (!desktop.matches) return;
      clearTimeout(closeTimer);
      setSubmenu(btn, true);
    });
    item.addEventListener("mouseleave", function () {
      if (!desktop.matches) return;
      closeTimer = setTimeout(function () { setSubmenu(btn, false); }, 160);
    });
    item.addEventListener("focusout", function (e) {
      if (desktop.matches && !item.contains(e.relatedTarget)) setSubmenu(btn, false);
    });
  });

  document.addEventListener("click", function (e) {
    if (!desktop.matches) return;
    menuButtons.forEach(function (btn) {
      if (!btn.closest(".nav-item--has-menu").contains(e.target)) setSubmenu(btn, false);
    });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    menuButtons.forEach(function (btn) {
      if (btn.getAttribute("aria-expanded") === "true") { setSubmenu(btn, false); btn.focus(); }
    });
    if (toggle && toggle.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
  });

  /* Footer year -------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* Contact form ------------------------------------------------------- */
  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = form.querySelector(".form-status");
  var submit = form.querySelector("button[type=submit]");
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var rules = {
    name: function (v) { return v.trim().length >= 2 || "Please enter your name."; },
    email: function (v) {
      if (!v.trim()) return "Please enter your email address.";
      return emailRe.test(v.trim()) || "This email address doesn't look right. Check for typos.";
    },
    topic: function (v) { return !!v || "Choose what your question is about."; },
    message: function (v) { return v.trim().length >= 10 || "Tell me a little more (at least 10 characters)."; }
  };

  function validateField(input) {
    var rule = rules[input.name];
    if (!rule) return true;
    var result = rule(input.value);
    var field = input.closest(".field");
    var error = field.querySelector(".field-error span");
    var ok = result === true;
    field.classList.toggle("has-error", !ok);
    input.setAttribute("aria-invalid", String(!ok));
    if (error) error.textContent = ok ? "" : result;
    return ok;
  }

  Object.keys(rules).forEach(function (name) {
    var input = form.elements[name];
    if (!input) return;
    input.addEventListener("blur", function () { if (input.value) validateField(input); });
    input.addEventListener("input", function () {
      if (input.closest(".field").classList.contains("has-error")) validateField(input);
    });
    input.addEventListener("change", function () { validateField(input); });
  });

  function showStatus(type, text) {
    status.className = "form-status is-" + type;
    status.textContent = text;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.className = "form-status";

    var firstInvalid = null;
    Object.keys(rules).forEach(function (name) {
      var input = form.elements[name];
      if (input && !validateField(input) && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) { firstInvalid.focus(); return; }
    if (form.elements.company_website && form.elements.company_website.value) return; // honeypot

    var data = new FormData(form);
    var endpoint = form.getAttribute("data-endpoint");

    // No form backend configured yet: hand the message to the visitor's mail app.
    if (!endpoint) {
      var topicLabel = form.elements.topic.options[form.elements.topic.selectedIndex].text;
      var body = [
        data.get("message"),
        "",
        "—",
        data.get("name") + (data.get("organisation") ? ", " + data.get("organisation") : ""),
        data.get("email")
      ].join("\n");
      window.location.href = "mailto:info@super-seating.com?subject=" +
        encodeURIComponent("Website enquiry: " + topicLabel) + "&body=" + encodeURIComponent(body);
      showStatus("success", "Your mail app should open with the message ready to send. If nothing happens, email info@super-seating.com directly.");
      return;
    }

    submit.setAttribute("aria-busy", "true");
    submit.querySelector(".label").textContent = "Sending…";

    fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
      .then(function (res) {
        if (!res.ok) throw new Error(res.status);
        form.reset();
        showStatus("success", "Thanks, your message has been sent. Bart will get back to you by email.");
      })
      .catch(function () {
        showStatus("error", "The message could not be sent. Please try again, or email info@super-seating.com directly.");
      })
      .finally(function () {
        submit.removeAttribute("aria-busy");
        submit.querySelector(".label").textContent = "Send message";
      });
  });
})();
