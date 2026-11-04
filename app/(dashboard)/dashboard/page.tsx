import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Eye,
  ExternalLink,
  MessageSquareWarning,
  Percent,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard } from "@/components/dashboard/metric-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
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

  async function countOf(eventType: string) {
    const { count } = await supabase
      .from("funnel_events")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("event_type", eventType);
    return count ?? 0;
  }

  const pageViews = await countOf("page_view");
  const positiveRedirects = await countOf("positive_redirect");

  const { count: feedbackCount } = await supabase
    .from("private_feedbacks")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id);

  const { count: unresolved } = await supabase
    .from("private_feedbacks")
    .select("*", { count: "exact", head: true })
    .eq("business_id", business.id)
    .neq("status", "resolved");

  const conversionRate =
    pageViews > 0 ? ((positiveRedirects / pageViews) * 100).toFixed(1) : "0.0";

  const totalInteractions = positiveRedirects + (feedbackCount ?? 0);
  const positiveSentiment =
    totalInteractions > 0
      ? Math.round((positiveRedirects / totalInteractions) * 100)
      : 100;
  const negativeSentiment = 100 - positiveSentiment;

  const { data: recentFeedback } = await supabase
    .from("private_feedbacks")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">
          Funnel performance &amp; sentiment for {business.name}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Funnel scans & views" value={pageViews} icon={Eye} />
        <MetricCard
          title="Google redirects"
          value={positiveRedirects}
          icon={ExternalLink}
          subtitle={`${positiveSentiment}% positive sentiment`}
        />
        <MetricCard
          title="Private feedback"
          value={feedbackCount ?? 0}
          icon={MessageSquareWarning}
          subtitle={`${unresolved ?? 0} unresolved complaints`}
        />
        <MetricCard
          title="Sentiment split"
          value={`${positiveSentiment}% / ${negativeSentiment}%`}
          icon={Percent}
          subtitle={`${conversionRate}% overall conversion`}
        />
      </div>

      {recentFeedback && recentFeedback.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent intercepted feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentFeedback.map((f: any) => (
              <div
                key={f.id}
                className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {f.customer_name}{" "}
                    <span className="text-amber-500">
                      {"★".repeat(f.rating)}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">{f.message}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge
                    variant={
                      f.status === "new"
                        ? "destructive"
                        : f.status === "contacted"
                          ? "warning"
                          : "success"
                    }
                  >
                    {f.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(f.created_at)}
                  </span>
                </div>
              </div>
            ))}
            <Link
              href="/dashboard/feedback"
              className="inline-block text-sm text-primary hover:underline"
            >
              View all in inbox →
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No feedback yet. Share your QR code or send an SMS invite to start collecting reviews.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
