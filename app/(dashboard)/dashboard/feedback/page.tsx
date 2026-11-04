import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedbackTable } from "@/components/dashboard/feedback-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
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

  const { data: feedbacks } = await supabase
    .from("private_feedbacks")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Private Feedback Inbox</h1>
        <p className="text-muted-foreground">
          1–3 star submissions intercepted before they reach Google.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackTable feedbacks={(feedbacks ?? []) as any} />
        </CardContent>
      </Card>
    </div>
  );
}
