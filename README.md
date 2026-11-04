# ReviewBoost

A focused reputation-acceleration SaaS MVP for local service businesses
(auto shops, dental clinics, salons, contractors). It routes satisfied
customers straight to their Google Business Profile review dialog and
intercepts unhappy ones through a private feedback loop.

## Stack

- **Next.js 14** (App Router, Server Actions, Route Handlers)
- **Supabase** (PostgreSQL + Auth + Row-Level Security)
- **Stripe** (Test Mode — Checkout + Webhooks)
- **Twilio** (SMS review invites)
- **Tailwind CSS + Lucide + shadcn-style UI primitives**

## Directory structure

```
app/
  (auth)/login, register
  (dashboard)/dashboard/{layout,page,feedback,campaigns,qr,settings}
  (dashboard)/billing
  (public)/r/[slug]         # public review funnel
  api/webhooks/stripe       # Stripe webhook
  api/sms/send              # Twilio SMS dispatch
  actions/                  # auth, business, feedback, billing server actions
components/
  ui/                       # button, input, card, badge, select, …
  dashboard/                # sidebar, metric cards, feedback table, forms
  public-funnel/            # review-funnel (star selector + branches)
  qr/                       # qr-dashboard (QR + printable tent card)
lib/
  supabase/{client,server,middleware,admin}
  stripe, twilio, utils, types
supabase/migrations/20261031_init_schema.sql
middleware.ts               # session refresh + protected routes
```

## Getting started

1. **Install dependencies**

   ```bash
   npm install        # or: pnpm install / yarn
   ```

   > **Windows + pnpm:** if `next build` fails with
   > `Cannot find module 'styled-jsx/package.json'`, reinstall with a flat
   > layout: `pnpm install --node-linker=hoisted`

2. **Configure environment** — copy `.env.example` to `.env.local` and fill in
   every value.

3. **Create the database** — run `supabase/migrations/20261031_init_schema.sql`
   in the Supabase SQL editor (or `supabase db push`).

4. **Run**

   ```bash
   npm run dev
   ```

## Wiring up Stripe (Test Mode — free)

1. Create a Stripe account and toggle **“View test data”** in the dashboard.
2. Copy your `sk_test_...` and `pk_test_...` keys into `.env.local`.
3. Create a **recurring price** (e.g. $29/month) under Products → Add price,
   then copy its `price_...` id into `STRIPE_PRICE_ID_STARTER`.
4. For webhooks, run the Stripe CLI to forward events locally:

   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

   Copy the `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`. In
   production, add the webhook endpoint in the Stripe dashboard.
5. Check out with card `4242 4242 4242 4242`.

## Wiring up Twilio (Free trial)

1. Create a Twilio account and copy `TWILIO_ACCOUNT_SID` and
   `TWILIO_AUTH_TOKEN` into `.env.local`.
2. Buy/trial a number and set `TWILIO_PHONE_NUMBER`.
3. Trial accounts can only message **verified numbers** — verify your own phone
   in the Twilio console first.

## Verification checklist

- [ ] `/r/[slug]` — 4–5 stars exposes the Google CTA (no private form).
- [ ] `/r/[slug]` — 1–3 stars hides Google and shows the private form; submit
      inserts into `private_feedbacks` with `status = 'new'`.
- [ ] Scan the QR on `/dashboard/qr` — it lands on `/r/[slug]`.
- [ ] Send an SMS from `/dashboard/campaigns` — it arrives with a valid link.
- [ ] RLS: a second account cannot read another tenant's `private_feedbacks`.
- [ ] Stripe test checkout updates the `subscriptions` table via webhook.

## Operational caveats

- **Google policy:** the funnel never *hides* the review dialog deceptively; the
  4–5 star path is an explicit “Share on Google” action. Keep copy
  customer-centric.
- **Direct link format:** use `search.google.com/local/writereview?placeid=…` or
  a `g.page/r/…/review` short link so customers land on the rating modal, not
  search results.
