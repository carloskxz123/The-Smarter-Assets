(function () {
  "use strict";

  var BRAND = window.__BRAND__ || {};
  var hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function safe(fn, name) {
    try { fn(); } catch (err) { if (window.console) console.warn("[init " + name + "]", err); }
  }

  function escHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Split headlines into words (keeps <em>, <br>) ---------- */
  function initSplit() {
    var els = document.querySelectorAll("[data-split]");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-split-in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -4% 0px" });

    els.forEach(function (el) {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = "1";
      el.classList.remove("reveal");
      el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
      var i = 0;
      var wrap = function (text) {
        return text.split(/(\s+)/).map(function (w) {
          if (!w || /^\s+$/.test(w)) return w;
          return '<span class="split-word" aria-hidden="true" style="--i:' + (i++) + '">' + escHTML(w) + "</span>";
        }).join("");
      };
      el.innerHTML = Array.prototype.map.call(el.childNodes, function (node) {
        if (node.nodeType === 3) return wrap(node.textContent);
        if (node.nodeName === "BR") return "<br>";
        if (node.nodeType === 1) {
          var tag = node.tagName.toLowerCase();
          return "<" + tag + ">" + wrap(node.textContent) + "</" + tag + ">";
        }
        return "";
      }).join("");
      io.observe(el);
    });

    // Safety: never leave words hidden
    setTimeout(function () {
      els.forEach(function (el) { el.classList.add("is-split-in"); });
    }, 6000);
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -4% 0px" });

    items.forEach(function (el, idx) {
      // small stagger for siblings
      var sibs = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      el.style.transitionDelay = Math.min(sibs, 5) * 70 + "ms";
      io.observe(el);
    });

    setTimeout(function () {
      document.querySelectorAll(".reveal:not(.is-visible)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("is-visible");
      });
    }, 6000);
  }

  /* ---------- Nav state + mobile buy bar ---------- */
  function initScrollUI() {
    var nav = document.querySelector("[data-nav]");
    var bar = document.querySelector("[data-buybar]");
    var hero = document.querySelector(".hero-cta");
    var final = document.querySelector("#pricing");
    var ticking = false;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      if (nav) nav.classList.toggle("is-scrolled", y > 10);
      if (bar && hero && final) {
        var pastHero = hero.getBoundingClientRect().bottom < 0;
        var atFinal = final.getBoundingClientRect().top < window.innerHeight * 0.85;
        bar.classList.toggle("is-shown", pastHero && !atFinal);
      }
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Hero parallax (gentle) ---------- */
  function initParallax() {
    var el = document.querySelector("[data-parallax]");
    if (!el) return;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // large shift = intrusive, so gated
    var base = window.innerWidth > 640 ? 1.2 : 0;
    window.addEventListener("scroll", function () {
      var y = Math.min(window.scrollY, 800);
      el.style.transform = "translate3d(0," + (y * 0.06).toFixed(1) + "px,0) rotate(" + (base - y * 0.002).toFixed(3) + "deg)";
    }, { passive: true });
  }

  /* ---------- Tilt on hover (desktop only) ---------- */
  function initTilt() {
    if (!hoverCapable) return;
    document.querySelectorAll("[data-tilt]").forEach(function (el) {
      if (el.dataset.tiltBound) return;
      el.dataset.tiltBound = "1";
      var baseRot = getComputedStyle(el).transform;
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = "perspective(900px) rotateY(" + (x * 7).toFixed(2) + "deg) rotateX(" + (-y * 7).toFixed(2) + "deg) translateZ(0)";
      });
      el.addEventListener("mouseout", function (e) {
        if (!el.contains(e.relatedTarget)) el.style.transform = baseRot === "none" ? "" : "";
      });
    });
  }

  /* ---------- Magnetic CTA ---------- */
  function initMagnetic() {
    if (!hoverCapable) return;
    document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      btn.addEventListener("mousemove", function (e) {
        var r = btn.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2);
        var y = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + (x * 0.18).toFixed(1) + "px," + (y * 0.25).toFixed(1) + "px)";
      });
      btn.addEventListener("mouseout", function (e) {
        if (!btn.contains(e.relatedTarget)) btn.style.transform = "";
      });
    });
  }

  /* ---------- Count-up for hero chips ---------- */
  function initCount() {
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var target = parseInt(el.dataset.count, 10);
      if (!target) return;
      var start = null;
      el.textContent = "0";
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1200, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      }
      setTimeout(function () { requestAnimationFrame(step); }, 500);
    });
  }

  /* ---------- Steps progress line ---------- */
  function initSteps() {
    var list = document.querySelector("[data-steps]");
    if (!list) return;
    function update() {
      var r = list.getBoundingClientRect();
      var vh = window.innerHeight;
      var p = (vh * 0.6 - r.top) / r.height;
      list.style.setProperty("--progress", Math.max(0, Math.min(1, p)).toFixed(3));
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- Lumpy-cost calculator ---------- */
  function initCalc() {
    var form = document.querySelector("[data-calc]");
    if (!form) return;
    var cost = form.querySelector("[data-cost]");
    var rhythm = form.querySelector("[data-rhythm]");
    var out = form.querySelector("[data-out]");
    var note = form.querySelector("[data-note]");
    var fill = form.querySelector("[data-jarfill]");
    var chips = form.querySelectorAll("[data-preset]");
    var rhythms = BRAND.payRhythms || {
      weekly: { label: "weekly", perYear: 52 },
      biweekly: { label: "every two weeks", perYear: 26 },
      semimonthly: { label: "twice a month", perYear: 24 },
      monthly: { label: "monthly", perYear: 12 }
    };
    var costName = "Christmas";
    var shown = 23.08;

    function fmt(n) {
      return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function animateTo(val) {
      var from = shown, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 500, 1);
        var v = from + (val - from) * (1 - Math.pow(1 - p, 3));
        out.textContent = fmt(v);
        if (p < 1) requestAnimationFrame(step); else shown = val;
      }
      requestAnimationFrame(step);
    }

    function calc() {
      var c = Math.max(0, parseFloat(cost.value) || 0);
      var r = rhythms[rhythm.value] || rhythms.biweekly;
      var per = c / r.perYear;
      animateTo(per);
      var name = costName || "that cost";
      var subject = name === "that cost" ? "that cost" : "the " + name + " bill";
      note.textContent = c > 0
        ? "Without a plan, " + subject + " takes " + fmt(c) + " out of one paycheck. With a pot, you set aside " + fmt(per) + " from each of your " + r.perYear + " paychecks, and the money is ready when it arrives."
        : "Type a yearly cost to see what it costs per paycheck.";
      // Jar fill: share of one paycheck's slice relative to $60 (visual only)
      var level = Math.max(0.12, Math.min(1, per / 60));
      if (fill) fill.style.transform = "translateY(" + (-102 * level).toFixed(1) + "px)";
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("is-active"); });
        chip.classList.add("is-active");
        cost.value = chip.dataset.preset;
        costName = chip.dataset.name;
        calc();
      });
    });
    cost.addEventListener("input", function () {
      chips.forEach(function (c) { c.classList.toggle("is-active", c.dataset.preset === cost.value); });
      var match = form.querySelector('[data-preset="' + cost.value + '"]');
      costName = match ? match.dataset.name : "that cost";
      calc();
    });
    rhythm.addEventListener("change", calc);

    // Fill the jar when it scrolls into view
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { calc(); io.disconnect(); }
    }, { threshold: 0.01 });
    io.observe(form);
  }

  /* ---------- Buy links point to the manifest URL ---------- */
  function initBuyLinks() {
    if (!BRAND.buyUrl) return;
    document.querySelectorAll("[data-buy]").forEach(function (a) { a.href = BRAND.buyUrl; });
  }

  function initYear() {
    var y = document.querySelector("[data-year]");
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Scroll progress bar ---------- */
  function initProgress() {
    var bar = document.querySelector("[data-progress]");
    if (!bar) return;
    var ticking = false;
    function update() {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.setProperty("--p", h > 0 ? Math.min(1, window.scrollY / h).toFixed(4) : 0);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* ---------- Prices count up when the pricing cards appear ---------- */
  function initPrices() {
    var prices = document.querySelectorAll("[data-price]");
    if (!prices.length) return;
    function run(el) {
      if (el.dataset.counted) return;
      el.dataset.counted = "1";
      var target = parseInt(el.dataset.price, 10), start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 900, 1);
        el.textContent = "$" + Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step); else el.textContent = "$" + target;
      }
      requestAnimationFrame(step);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.01 });
    prices.forEach(function (el) { io.observe(el); });
  }

  function boot() {
    document.documentElement.classList.remove("no-js");
    safe(initSplit, "split");
    safe(initReveal, "reveal");
    safe(initScrollUI, "scrollUI");
    safe(initParallax, "parallax");
    safe(initTilt, "tilt");
    safe(initMagnetic, "magnetic");
    safe(initCount, "count");
    safe(initSteps, "steps");
    safe(initCalc, "calc");
    safe(initBuyLinks, "buyLinks");
    safe(initYear, "year");
    safe(initProgress, "progress");
    safe(initPrices, "prices");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
