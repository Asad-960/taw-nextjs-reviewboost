import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  createBillingPortal,
} from "@/app/actions/billing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: { success?: string; canceled?: string; error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, created_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) redirect("/dashboard/settings");

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  const isRecentBusiness =
    Date.now() - new Date(business.created_at).getTime() <
    14 * 24 * 60 * 60 * 1000;
  const isTrial = sub?.status === "trialing" || (!sub && isRecentBusiness);
  const isActive = sub?.status === "active" || isTrial;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing &amp; Subscription</h1>
        <p className="text-muted-foreground">
          Manage your ReviewBoost plan for {business.name}.
        </p>
      </div>

      {searchParams?.success && (
        <div className="rounded-md bg-emerald-50 p-4 text-emerald-800">
          Subscription updated successfully! Your account is active.
        </div>
      )}
      {searchParams?.canceled && (
        <div className="rounded-md bg-amber-50 p-4 text-amber-800">
          Checkout was canceled — you can subscribe anytime.
        </div>
      )}
      {searchParams?.error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          {searchParams.error === "missing_price_id"
            ? "STRIPE_PRICE_ID_STARTER is not configured in environment variables."
            : "An error occurred with Stripe checkout. Please try again."}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current plan</CardTitle>
          <CardDescription>
            Starter tier for single-location reputation acceleration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Starter Plan — $29/month</p>
              <p className="text-sm text-muted-foreground">
                Unlimited QR scans, private feedback inbox, Twilio SMS campaigns,
                and real-time alerts.
              </p>
            </div>
            <Badge
              variant={
                sub?.status === "active"
                  ? "success"
                  : isTrial
                    ? "warning"
                    : "secondary"
              }
            >
              {sub?.status ?? (isTrial ? "trialing" : "no plan")}
            </Badge>
          </div>

          {sub?.current_period_end ? (
            <p className="text-sm text-muted-foreground">
              Current period ends {formatDate(sub.current_period_end)}.
            </p>
          ) : isTrial ? (
            <p className="text-sm text-amber-700">
              14-day Free Trial is active. Subscribe to ensure uninterrupted service.
            </p>
          ) : null}

          <div className="flex gap-2 pt-2">
            {sub?.stripe_subscription_id ? (
              <form action={createBillingPortal}>
                <Button type="submit" variant="outline">
                  Manage Stripe billing
                </Button>
              </form>
            ) : (
              <form action={createCheckoutSession}>
                <Button type="submit">
                  {isTrial ? "Upgrade to Paid Plan — $29/mo" : "Subscribe — $29/mo"}
                </Button>
              </form>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Stripe Test Mode is active. Use test card{" "}
            <code className="rounded bg-muted px-1">
              4242 4242 4242 4242
            </code>{" "}
            with any future expiry and CVC.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
