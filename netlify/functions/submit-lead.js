/* POST /.netlify/functions/submit-lead
   1. Validates + records EVERY application to the Google Sheet (with the
      affiliate/referrer attached).
   2. Decides the route (payment / booking / community).
   3. If "payment", creates a Stripe Checkout Session (carrying the
      affiliate code in metadata) and returns its URL.
   Response: { route, checkoutUrl? } */
const { appendRow } = require("./_lib/sheets");
const { decideRoute } = require("./_lib/routing");

const JSON_HEADERS = { "Content-Type": "application/json" };

function bad(status, error) {
  return { statusCode: status, headers: JSON_HEADERS, body: JSON.stringify({ error }) };
}

function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || ""));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return bad(405, "Method not allowed.");

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (_) {
    return bad(400, "Invalid request.");
  }

  // Basic validation
  if (!data.name || !String(data.name).trim()) return bad(400, "Name is required.");
  if (!isEmail(data.email)) return bad(400, "A valid email is required.");
  if (!data.capital || !data.timeline) return bad(400, "Please complete the application.");

  const route = decideRoute(data);
  const now = new Date().toISOString();

  // --- 1) Record the lead (best-effort: never block the user on a sheet error)
  try {
    await appendRow(
      [
        now,
        String(data.name).trim(),
        String(data.email).trim(),
        String(data.phone || "").trim(),
        data.experience || "",
        (data.goal || "").toString().slice(0, 1000),
        data.capital || "",
        data.timeline || "",
        route,
        data.affiliate || "",
        data.affiliateFirstTouch || "",
        data.affiliateLanding || "",
        data.utmSource || "",
        data.utmMedium || "",
        data.utmCampaign || "",
        "new", // payment status column (updated by stripe-webhook)
      ],
      "Leads"
    );
  } catch (err) {
    console.error("[submit-lead] sheet append error:", err.message);
    // Continue — we still route the user even if logging failed.
  }

  // --- 2) For payment route, create a Stripe Checkout Session
  if (route === "payment") {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
      console.error("[submit-lead] Stripe not configured; falling back to booking.");
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ route: "booking" }) };
    }
    try {
      const Stripe = require("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const base = process.env.URL || `https://${event.headers.host}`;

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        customer_email: String(data.email).trim(),
        success_url: `${base}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/cancel.html`,
        allow_promotion_codes: true,
        // Everything we need to attribute the sale later:
        client_reference_id: data.affiliate || "direct",
        metadata: {
          name: String(data.name).trim(),
          phone: String(data.phone || "").trim(),
          affiliate: data.affiliate || "",
          affiliate_first_touch: data.affiliateFirstTouch || "",
          experience: data.experience || "",
          capital: data.capital || "",
        },
      });

      return {
        statusCode: 200,
        headers: JSON_HEADERS,
        body: JSON.stringify({ route: "payment", checkoutUrl: session.url }),
      };
    } catch (err) {
      console.error("[submit-lead] Stripe error:", err.message);
      // Don't strand the user — send them to booking instead.
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ route: "booking" }) };
    }
  }

  // --- 3) booking / community
  return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ route }) };
};
