/* =====================================================================
   Application form: multi-step UX + submit + routing.
   Routing decision is made SERVER-SIDE (submit-lead function) so the
   thresholds can't be gamed from the browser. This file just drives the
   UI and reacts to the route it gets back.
   ===================================================================== */
(function () {
  var form = document.getElementById("applyForm");
  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var bar = document.getElementById("bar");
  var submitBtn = document.getElementById("submitBtn");
  var resultArea = document.getElementById("resultArea");
  var current = 0;

  function showStep(i) {
    steps.forEach(function (s, idx) { s.classList.toggle("active", idx === i); });
    bar.style.width = ((i + 1) / steps.length) * 100 + "%";
    current = i;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  showStep(0);

  // Radio tile visual selection
  form.querySelectorAll(".radio-tile input").forEach(function (input) {
    input.addEventListener("change", function () {
      var group = input.closest(".radio-group");
      group.querySelectorAll(".radio-tile").forEach(function (t) { t.classList.remove("selected"); });
      input.closest(".radio-tile").classList.add("selected");
      clearError(input.name);
    });
  });

  function setError(name, msg) {
    var el = form.querySelector('[data-err="' + name + '"]');
    if (el) el.textContent = msg || "";
  }
  function clearError(name) { setError(name, ""); }

  function validateStep(i) {
    var step = steps[i];
    var ok = true;
    // text/email/tel
    step.querySelectorAll("input[required], textarea[required]").forEach(function (input) {
      if (input.type === "radio") return;
      if (!input.value.trim()) { setError(input.name, "This field is required."); ok = false; }
      else if (input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        setError(input.name, "Enter a valid email."); ok = false;
      } else clearError(input.name);
    });
    // radio groups in this step
    step.querySelectorAll("[data-radio]").forEach(function (group) {
      var name = group.getAttribute("data-radio");
      if (!form.querySelector('input[name="' + name + '"]:checked')) {
        setError(name, "Please pick one."); ok = false;
      }
    });
    return ok;
  }

  form.querySelectorAll("[data-next]").forEach(function (btn) {
    btn.addEventListener("click", function () { if (validateStep(current)) showStep(current + 1); });
  });
  form.querySelectorAll("[data-prev]").forEach(function (btn) {
    btn.addEventListener("click", function () { showStep(current - 1); });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(current)) return;

    var data = Object.fromEntries(new FormData(form).entries());
    var aff = (window.AMZURA.getAffiliate && window.AMZURA.getAffiliate()) || {};
    var payload = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      experience: data.experience,
      goal: data.goal || "",
      capital: data.capital,
      timeline: data.timeline,
      affiliate: aff.ref || "",
      affiliateFirstTouch: aff.firstTouch || "",
      affiliateLanding: aff.landing || "",
      utmSource: aff.utmSource || "",
      utmMedium: aff.utmMedium || "",
      utmCampaign: aff.utmCampaign || "",
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    showLoading();

    fetch("/.netlify/functions/submit-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body && res.body.error ? res.body.error : "Something went wrong.");
        route(res.body, payload);
      })
      .catch(function (err) {
        renderError(err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit application →";
      });
  });

  function hideForm() { form.style.display = "none"; }

  function showLoading() {
    resultArea.innerHTML =
      '<div class="result-screen"><div class="spinner"></div><p>Reviewing your application…</p></div>';
  }

  function route(res, payload) {
    hideForm();
    if (res.route === "payment" && res.checkoutUrl) {
      resultArea.innerHTML =
        '<div class="result-screen"><h2>You\'re a strong fit</h2>' +
        "<p>Taking you to secure checkout to confirm your place…</p><div class='spinner'></div></div>";
      window.location.href = res.checkoutUrl;
      return;
    }
    if (res.route === "booking") {
      var refQ = payload.affiliate ? "?ref=" + encodeURIComponent(payload.affiliate) : "";
      resultArea.innerHTML =
        '<div class="result-screen"><h2>Let\'s talk it through</h2>' +
        "<p>Book a free strategy call with a mentor to map out your path and answer your questions.</p>" +
        '<a class="btn btn-primary btn-lg" href="/book.html' + refQ + '">Pick a time</a>' +
        "<p class='form-note' style='margin-top:16px;'>Taking you to the calendar…</p></div>";
      // Auto-forward after a moment
      setTimeout(function () { window.location.href = "/book.html" + refQ; }, 2500);
      return;
    }
    // community (not in budget / just exploring)
    var discord = window.AMZURA.discordInvite || "https://discord.gg/your-invite";
    resultArea.innerHTML =
      '<div class="result-screen"><h2>Start with our community</h2>' +
      "<p>Based on your answers, the best next step is our free community. Learn the fundamentals, " +
      "connect with other sellers, and step into the coaching when the timing's right.</p>" +
      '<a class="btn btn-primary btn-lg" href="' + discord + '" target="_blank" rel="noopener">Join the community</a>' +
      '<p class="form-note" style="margin-top:20px;">We\'ve saved your application — a team member may still reach out.</p></div>';
  }

  function renderError(msg) {
    resultArea.innerHTML =
      '<div class="result-screen"><h3>That didn\'t go through</h3>' +
      "<p>" + (msg || "Please try again.") + "</p></div>";
  }

  // Affiliate badge
  document.addEventListener("DOMContentLoaded", function () {
    var aff = (window.AMZURA.getAffiliate && window.AMZURA.getAffiliate()) || {};
    if (aff.ref) {
      document.getElementById("refBadgeWrap").innerHTML =
        '<div style="text-align:center;"><span class="badge-ref">Referred by ' + escapeHtml(aff.ref) + "</span></div>";
    }
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
