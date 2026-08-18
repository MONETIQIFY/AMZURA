/* GET /.netlify/functions/site-config
   Returns the PUBLIC front-end config from env vars so the owner sets
   everything in one place (Netlify env) without editing code. Only
   non-secret values are exposed here. */
exports.handler = async () => {
  const cfg = {
    discordInvite: process.env.PUBLIC_DISCORD_INVITE || "",
    calcomLink: process.env.PUBLIC_CALCOM_LINK || "",
    priceDisplay: process.env.PUBLIC_PRICE_DISPLAY || "",
    priceSubtext: process.env.PUBLIC_PRICE_SUBTEXT || "",
  };
  // Strip empty values so front-end fallbacks apply.
  Object.keys(cfg).forEach((k) => cfg[k] === "" && delete cfg[k]);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" },
    body: JSON.stringify(cfg),
  };
};
