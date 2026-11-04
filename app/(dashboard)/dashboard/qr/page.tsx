import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QrDashboard } from "@/components/qr/qr-dashboard";

export const dynamic = "force-dynamic";

export default async function QrPage() {
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/r/${business.slug}`;

  return <QrDashboard business={business} url={url} />;
}
