import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SmsForm } from "@/components/dashboard/sms-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
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

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  const isRecentBusiness =
    Date.now() - new Date(business.created_at).getTime() <
    14 * 24 * 60 * 60 * 1000;
  const isSubscribed =
    sub?.status === "active" ||
    sub?.status === "trialing" ||
    (!sub && isRecentBusiness);

  const { data: campaigns } = await supabase
    .from("sms_campaigns")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SMS Campaigns</h1>
        <p className="text-muted-foreground">
          Send instant review invites to your customers via Twilio.
        </p>
      </div>

      {!isSubscribed && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-semibold">Subscription required</p>
              <p className="text-sm text-amber-800">
                Your trial or plan has expired. Subscribe to continue sending SMS review invites.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/billing">
              <CreditCard className="mr-2 h-4 w-4" /> Go to Billing
            </Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send a review invite</CardTitle>
          <CardDescription>
            The default message links to {`/r/${business.slug}`}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SmsForm disabled={!isSubscribed} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">History</CardTitle>
        </CardHeader>
        <CardContent>
          {campaigns && campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 pr-4 font-medium">Sent</th>
                    <th className="py-3 pr-4 font-medium">Recipient</th>
                    <th className="py-3 pr-4 font-medium">Phone</th>
                    <th className="py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c: any) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="whitespace-nowrap py-3 pr-4">
                        {formatDateTime(c.created_at)}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {c.recipient_name}
                      </td>
                      <td className="py-3 pr-4">{c.recipient_phone}</td>
                      <td className="py-3">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-center text-muted-foreground">
              No SMS sent yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
