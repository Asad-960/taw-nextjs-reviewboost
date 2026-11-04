"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/stripe";

export async function createCheckoutSession() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) redirect("/dashboard/settings");

  const priceId = process.env.STRIPE_PRICE_ID_STARTER;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!priceId) {
    redirect(`${appUrl}/billing?error=missing_price_id`);
  }

  // Reuse an existing Stripe customer if we already created one.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", business.id)
    .maybeSingle();

  let customerId: string;
  try {
    if (sub?.stripe_customer_id) {
      customerId = sub.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { business_id: business.id },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${appUrl}/billing?success=1`,
      cancel_url: `${appUrl}/billing?canceled=1`,
      metadata: { business_id: business.id },
      subscription_data: { metadata: { business_id: business.id } },
    });

    if (session.url) {
      redirect(session.url);
    } else {
      redirect(`${appUrl}/billing?error=checkout_failed`);
    }
  } catch (err: any) {
    console.error("Stripe Checkout creation error:", err);
    redirect(`${appUrl}/billing?error=stripe_unavailable`);
  }
}

export async function createBillingPortal() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) redirect("/dashboard/settings");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", business.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    redirect("/billing");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });
    redirect(portal.url);
  } catch (err: any) {
    console.error("Stripe Billing Portal creation error:", err);
    redirect(`${appUrl}/billing?error=portal_failed`);
  }
}
