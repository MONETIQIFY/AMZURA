/* Server-side routing rules. Decides where an applicant goes:
   - "payment"   → qualified + ready to enroll now  → Stripe checkout
   - "booking"   → qualified + wants to talk first   → Cal.com call
   - "community" → not in budget / just exploring    → Discord invite

   Kept here (server-side) so thresholds can't be manipulated from the
   browser. Tweak the sets below to change qualification rules. */

// Capital brackets that are too low to qualify (sent to the free community).
// Anyone with more than £500 qualifies as a lead.
const LOW_CAPITAL = new Set(["0-500"]);

// Timelines that mean "not a lead right now" → community.
const EXPLORING = new Set(["just-exploring"]);

function decideRoute(lead) {
  const capital = String(lead.capital || "").trim();
  const timeline = String(lead.timeline || "").trim();

  // 1) Not in budget (£0–£500) → free community (Discord)
  if (LOW_CAPITAL.has(capital)) return "community";

  // 2) Just exploring → free community (Discord)
  if (EXPLORING.has(timeline)) return "community";

  // 3) Ready to enroll now → straight to Stripe payment
  if (timeline === "ready-now") return "payment";

  // 4) Wants to talk to a mentor first → booking call
  return "booking";
}

module.exports = { decideRoute };
