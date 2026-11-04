import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReviewFunnel } from "@/components/public-funnel/review-funnel";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select(
      "id, name, slug, google_place_id, google_review_url, logo_url, min_google_rating",
    )
    .eq("slug", params.slug)
    .single();

  if (!business) notFound();

  // Log page view event safely
  try {
    await supabase.from("funnel_events").insert({
      business_id: business.id,
      event_type: "page_view",
    });
  } catch (err) {
    console.error("Failed to record page_view funnel event:", err);
  }

  return <ReviewFunnel business={business as any} />;
}
