# AMZURA — Amazon FBA Mentorship Site

A high-ticket mentorship funnel that routes every applicant to the right next step:

| Applicant | Route | Where they go |
| --- | --- | --- |
| Qualified + ready to enroll now | **payment** | Stripe checkout |
| Qualified + wants to talk first | **booking** | Cal.com call (live Google Calendar slots) |
| Not in budget / just exploring | **community** | Discord invite |

Every application is saved to a **Google Sheet** with the **affiliate/referrer** who sent them, and every completed payment is logged with that same affiliate — so you always know which influencer produced which customer.

---

## How it's built

- **Front-end:** static HTML/CSS/JS in `public/` (no build step — fast + reliable).
- **Back-end:** Netlify Functions in `netlify/functions/` (Stripe, Google Sheets, config).
- **Payments:** Stripe Checkout.
- **Booking:** Cal.com inline embed (mentors connect Google Calendar once; availability is live).
- **Leads + affiliates:** Google Sheets via a service account.
- **Hosting:** GitHub → Netlify (auto-deploys on push).

```
public/                 ← the website (what visitors see)
  index.html            ← sales landing page
  apply.html            ← the application form (the funnel)
  book.html             ← Cal.com booking embed
  success.html          ← after successful payment
  cancel.html           ← if checkout is abandoned
  assets/css/style.css  ← black & blue theme (all colors are variables)
  assets/js/            ← affiliate tracking + form logic
netlify/functions/
  submit-lead.js        ← saves lead, decides route, starts Stripe checkout
  stripe-webhook.js     ← logs confirmed payments to the sheet
  site-config.js        ← serves public config (Discord/Cal links) from env
  _lib/                 ← shared helpers (sheets, routing rules)
```

---

## One-time setup checklist

You'll create 4 free accounts and paste some keys. **~30–45 minutes.** Go in this order.

### 1. Netlify (hosting)
1. Go to [netlify.com](https://netlify.com) → sign up (use **"Log in with GitHub"**).
2. **Add new site → Import an existing project → GitHub →** pick this repo (`monetiqify/amzura`).
3. Build settings are auto-read from `netlify.toml` — just click **Deploy**.
4. Your site goes live at a `something.netlify.app` URL (you can add a custom domain later under **Domain settings**).

> After the first deploy, come back and add the environment variables (step 5) — the site works visually right away, but payments/booking/leads need the keys.

### 2. Stripe (payments)
1. Sign up at [stripe.com](https://stripe.com). Start in **Test mode** (toggle, top-right).
2. **Products → Add product:** name it "AMZURA Mentorship", set the price (e.g. $4,000, one-time). Save.
3. Open the product → copy the **Price ID** (`price_...`) → this is `STRIPE_PRICE_ID`.
4. **Developers → API keys:** copy the **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`.
5. **Developers → Webhooks → Add endpoint:**
   - URL: `https://YOUR-SITE.netlify.app/.netlify/functions/stripe-webhook`
   - Events: select **`checkout.session.completed`**
   - Save → copy the **Signing secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`.
6. When you're ready for real payments, flip Stripe to **Live mode** and repeat steps 3–5 with the live keys.

### 3. Google Sheet (leads + payments)
1. Create a new Google Sheet. Make **two tabs** named exactly **`Leads`** and **`Payments`**.
   *(Optional) paste these headers in row 1:*
   - **Leads:** `Timestamp | Name | Email | Phone | Experience | Goal | Capital | Timeline | Route | Affiliate | First Touch | Landing | UTM Source | UTM Medium | UTM Campaign | Status`
   - **Payments:** `Timestamp | Name | Email | Phone | Amount | Currency | Affiliate | First Touch | Experience | Capital | Payment Status | Stripe Session`
2. Copy the **Sheet ID** from the URL (`docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`) → `GOOGLE_SHEET_ID`.
3. Create a **service account** (the "robot" that writes to the sheet):
   - Go to [console.cloud.google.com](https://console.cloud.google.com) → create a project.
   - **APIs & Services → Library →** enable **Google Sheets API**.
   - **APIs & Services → Credentials → Create credentials → Service account.** Name it, create.
   - Open the service account → **Keys → Add key → Create new key → JSON.** A file downloads.
4. From that JSON file:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_PRIVATE_KEY` (paste the whole thing including `-----BEGIN...`)
5. **Share the Google Sheet** with the `client_email` address as an **Editor** (just like sharing with a person). This is the step people forget!

### 4. Cal.com (booking, syncs Google Calendar)
1. Sign up at [cal.com](https://cal.com) (free).
2. **Connect the mentors' Google Calendar** (Settings → Connected calendars) so busy times are blocked automatically.
3. Create an event type (e.g. "Strategy Call", 30 min).
4. Your booking link looks like `cal.com/yourname/strategy-call`. The part after `cal.com/` (`yourname/strategy-call`) is `PUBLIC_CALCOM_LINK`.

### 5. Discord (out-of-budget leads)
1. In your Discord server: **Invite People → Edit invite link → set "Expire after: Never"** → copy it. That's `PUBLIC_DISCORD_INVITE`.

### 6. Add all the keys to Netlify
In Netlify: **Site settings → Environment variables → Add a variable** (add each one from the list below).
See `.env.example` for the full annotated list. After adding them, **Deploys → Trigger deploy → Deploy site** so they take effect.

| Variable | From |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe API keys |
| `STRIPE_PRICE_ID` | Stripe product price |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook |
| `GOOGLE_SHEET_ID` | Sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | service account JSON |
| `GOOGLE_PRIVATE_KEY` | service account JSON |
| `PUBLIC_DISCORD_INVITE` | Discord invite |
| `PUBLIC_CALCOM_LINK` | Cal.com link |
| `PUBLIC_PRICE_DISPLAY` | *(optional)* e.g. `$4,000` shown on the page |
| `PUBLIC_PRICE_SUBTEXT` | *(optional)* e.g. `one-time · lifetime access` |

---

## Affiliate links (for influencers)

Give each influencer a link with their code on the end:

```
https://YOUR-SITE.netlify.app/?ref=JAKE
https://YOUR-SITE.netlify.app/?ref=SARAH
```

- The code is remembered for **60 days** (first-touch wins) across the whole site.
- It's saved on the application row **and** on the payment row in your sheet.
- To see performance, filter/pivot the sheet by the **Affiliate** column.

You can use `?ref=`, `?via=`, or `?aff=` — all work. Add UTM params too if you like (`&utm_source=youtube`), they're captured as well.

---

## Changing things later

- **Prices/plans:** edit the product in Stripe; update `STRIPE_PRICE_ID`. The displayed price is `PUBLIC_PRICE_DISPLAY`.
- **Who goes where (qualification rules):** `netlify/functions/_lib/routing.js` — plain, commented rules.
- **Copy/text & sections:** edit the HTML in `public/`.
- **Colors/branding:** all colors are variables at the top of `public/assets/css/style.css`. Swap them to match the logo.
- **Form questions:** `public/apply.html` (and keep the sheet columns in `submit-lead.js` in sync if you add fields).

## Run locally (optional, for testing)

```bash
npm install
npm run dev      # starts netlify dev at http://localhost:8888
```
Create a `.env` file (copy `.env.example`) with test keys to try the full flow locally.

---

*Built to be handed off. If something breaks, the function logs are in Netlify under **Functions → (function name) → Logs**.*
