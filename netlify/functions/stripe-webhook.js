/* POST /.netlify/functions/stripe-webhook
   Stripe calls this when a payment completes. We verify the signature,
   then append a confirmed-payment row (with affiliate attribution) to the
   "Payments" tab of the Google Sheet.

   IMPORTANT: add STRIPE_WEBHOOK_SECRET (whsec_...) in Netlify env vars and
   point a Stripe webhook at this URL for the event
   `checkout.session.completed`. */
const { appendRow } = require("./_lib/sheets");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    console.error("[stripe-webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
    return { statusCode: 500, body: "Webhook not configured" };
  }

  const Stripe = require("stripe");
  const stripe = new Stripe(stripeKey);

  // Stripe needs the RAW body for signature verification.
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body;
  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const s = stripeEvent.data.object;
    const md = s.metadata || {};
    try {
      await appendRow(
        [
          new Date().toISOString(),
          md.name || "",
          s.customer_details ? s.customer_details.email : s.customer_email || "",
          md.phone || "",
          ((s.amount_total || 0) / 100).toFixed(2),
          (s.currency || "usd").toUpperCase(),
          md.affiliate || s.client_reference_id || "",
          md.affiliate_first_touch || "",
          md.experience || "",
          md.capital || "",
          s.payment_status || "",
          s.id,
        ],
        "Payments"
      );
    } catch (err) {
      console.error("[stripe-webhook] Failed to log payment:", err.message);
      // Return 200 anyway so Stripe doesn't endlessly retry a sheet outage;
      // the payment itself is safe in Stripe's dashboard.
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
