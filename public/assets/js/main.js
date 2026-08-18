/* =====================================================================
   Affiliate tracking + shared UI helpers.

   How affiliate tracking works:
   1. An influencer sends traffic to  https://yoursite.com/?ref=THEIRCODE
   2. We store THEIRCODE (plus first-touch timestamp + landing page) in a
      cookie + localStorage so it survives page navigation.
   3. Every lead submission and every Stripe payment carries that code,
      so you always know which affiliate produced which customer.
   ===================================================================== */
(function () {
  var REF_KEY = "amzura_ref";
  var REF_DAYS = 60; // attribution window

  function getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function setCookie(name, value, days) {
    var d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie =
      name + "=" + encodeURIComponent(value) + ";expires=" + d.toUTCString() + ";path=/;SameSite=Lax";
  }

  function getCookie(name) {
    var match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
  }

  // Capture ref on landing (accept ?ref=, ?via=, ?aff=)
  var incoming = getParam("ref") || getParam("via") || getParam("aff");
  var stored = null;
  try {
    stored = JSON.parse(localStorage.getItem(REF_KEY) || getCookie(REF_KEY) || "null");
  } catch (_) {
    stored = null;
  }

  if (incoming && (!stored || !stored.ref)) {
    // First touch wins — don't overwrite an existing attribution.
    stored = {
      ref: incoming,
      firstTouch: new Date().toISOString(),
      landing: window.location.pathname + window.location.search,
      utmSource: getParam("utm_source") || "",
      utmMedium: getParam("utm_medium") || "",
      utmCampaign: getParam("utm_campaign") || "",
    };
    try {
      localStorage.setItem(REF_KEY, JSON.stringify(stored));
    } catch (_) {}
    setCookie(REF_KEY, JSON.stringify(stored), REF_DAYS);
  }

  // Expose for other scripts (apply form, checkout)
  window.AMZURA = window.AMZURA || {};
  window.AMZURA.getAffiliate = function () {
    return stored || { ref: "", firstTouch: "", landing: "" };
  };

  // Keep ?ref in internal links so multi-page navigation preserves it
  document.addEventListener("DOMContentLoaded", function () {
    if (!stored || !stored.ref) return;
    document.querySelectorAll('a[href^="/"], a[href^="./"], a[href^="apply"], a[href^="book"]').forEach(function (a) {
      try {
        var url = new URL(a.getAttribute("href"), window.location.origin);
        if (!url.searchParams.get("ref")) {
          url.searchParams.set("ref", stored.ref);
          a.setAttribute("href", url.pathname + url.search);
        }
      } catch (_) {}
    });
  });
})();
