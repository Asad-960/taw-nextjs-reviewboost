import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function mapStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    case "paused":
      return "past_due";
    default:
      return "incomplete";
  }
}

async function upsertSubscription(sub: Stripe.Subscription) {
  let businessId = sub.metadata?.business_id;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const admin = createAdminClient();

  if (!businessId) {
    // Resilient fallback: find business_id via subscription id or customer id
    const { data: existing } = await admin
      .from("subscriptions")
      .select("business_id")
      .or(
        `stripe_subscription_id.eq.${sub.id},stripe_customer_id.eq.${customerId}`,
      )
      .maybeSingle();

    if (existing?.business_id) {
      businessId = existing.business_id;
    }
  }

  if (!businessId) {
    console.warn("Unable to resolve business_id for Stripe subscription:", sub.id);
    return;
  }

  await admin.from("subscriptions").upsert(
    {
      business_id: businessId,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      status: mapStatus(sub.status),
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    },
    { onConflict: "business_id" },
  );
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (
          session.mode === "subscription" &&
          typeof session.subscription === "string"
        ) {
          const sub = await stripe.subscriptions.retrieve(
            session.subscription,
          );
          await upsertSubscription(sub);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub);
        break;
      }
      default:
        break;
    }
  } catch (err: any) {
    console.error("Webhook handler error:", err.message);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
