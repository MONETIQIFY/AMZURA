/* =====================================================================
   Public front-end config + fallbacks.
   The real values come from Netlify env vars (served by the
   `site-config` function). These defaults keep the site usable while
   previewing statically. Edit the copy/branding here freely.
   ===================================================================== */
window.AMZURA = {
  brand: "AMZURA",

  // Displayed price on the sales page (cosmetic only — the real charge
  // is controlled by the Stripe Price ID in your env vars).
  priceDisplay: "£750",
  priceSubtext: "one-time · lifetime access",

  // Fallbacks used only if the site-config function is unreachable.
  discordInvite: "https://discord.gg/rQSQMAGsF",
  calcomLink: "yourteam/strategy-call",

  // Sales video (VSL). Either:
  //  - videoUrl: a direct video file link (.mp4/.mov/.webm), OR
  //  - videoId:  a YouTube video ID (the part after watch?v=)
  // videoUrl takes priority. Leave both empty for the branded poster.
  videoUrl: "/assets/video/vsl.mp4",
  videoId: "",

  // The "not in budget" threshold is enforced server-side; this is just
  // the label shown in the budget question.
  loaded: false,
};

/* Pull live config (Discord invite, Cal link, price) from the function. */
async function loadSiteConfig() {
  try {
    const res = await fetch("/.netlify/functions/site-config", { cache: "no-store" });
    if (res.ok) {
      const cfg = await res.json();
      Object.assign(window.AMZURA, cfg, { loaded: true });
    }
  } catch (_) {
    /* Static preview — use fallbacks above. */
  }
  document.dispatchEvent(new CustomEvent("amzura:config"));
}
loadSiteConfig();
