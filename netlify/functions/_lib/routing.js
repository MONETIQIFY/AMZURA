/* Server-side routing rules. Decides where an applicant goes:
   - "payment"   → qualified + ready to enroll now  → Stripe checkout
   - "booking"   → qualified + wants to talk first   → Cal.com call
   - "community" → not in budget / just exploring    → Discord invite

   Kept here (server-side) so thresholds can't be manipulated from the
   browser. Tweak the sets below to change qualification rules. */

// Capital brackets that are too low to invest in inventory yet.
const LOW_CAPITAL = new Set(["under-2k"]);

// Timelines that mean "not ready to commit" → community.
const NOT_READY = new Set(["just-exploring"]);

function decideRoute(lead) {
  const capital = String(lead.capital || "").trim();
  const timeline = String(lead.timeline || "").trim();

  // 1) Not in budget for inventory → free community (Discord)
  if (LOW_CAPITAL.has(capital)) return "community";

  // 2) Qualified capital but just browsing → community
  if (NOT_READY.has(timeline)) return "community";

  // 3) Qualified + ready to enroll → straight to payment
  if (timeline === "ready-now") return "payment";

  // 4) Qualified but wants to talk (talk-first, few-months) → booking
  return "booking";
}

module.exports = { decideRoute };
