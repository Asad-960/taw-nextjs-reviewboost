"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/stripe";

function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.startsWith("http") ? envUrl.replace(/\/+$/, "") : `https://${envUrl.replace(/\/+$/, "")}`;
  }
  return "";
}

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
  const baseUrl = getBaseUrl();
  const origin = baseUrl || "http://localhost:3000";

  if (!priceId) {
    redirect("/billing?error=missing_price_id");
  }

  // Reuse an existing Stripe customer if we already created one.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("business_id", business.id)
    .maybeSingle();

  let customerId: string;
  let sessionUrl: string | null = null;

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
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/billing?canceled=1`,
      metadata: { business_id: business.id },
      subscription_data: { metadata: { business_id: business.id } },
    });

    sessionUrl = session.url;
  } catch (err: any) {
    // Next.js redirect throws a NEXT_REDIRECT error which must not be swallowed
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Stripe Checkout creation error:", err);
    redirect("/billing?error=stripe_unavailable");
  }

  if (sessionUrl) {
    redirect(sessionUrl);
  } else {
    redirect("/billing?error=checkout_failed");
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

  const baseUrl = getBaseUrl();
  const origin = baseUrl || "http://localhost:3000";

  let portalUrl: string | null = null;
  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${origin}/billing`,
    });
    portalUrl = portal.url;
  } catch (err: any) {
    if (err?.message === "NEXT_REDIRECT" || err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    console.error("Stripe Billing Portal creation error:", err);
    redirect("/billing?error=portal_failed");
  }

  if (portalUrl) {
    redirect(portalUrl);
  } else {
    redirect("/billing?error=portal_failed");
  }
}
