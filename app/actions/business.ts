"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertBusiness(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  let googleReviewUrl = String(formData.get("google_review_url") ?? "").trim();
  const googlePlaceId = String(formData.get("google_place_id") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim();
  const minRating = Number(formData.get("min_google_rating") ?? 4);

  if (!name) return { error: "Business name is required." };
  if (!slug) return { error: "Review slug is required." };

  // If user provided Place ID but no URL (or partial), auto-construct official review link
  if (!googleReviewUrl && googlePlaceId) {
    googleReviewUrl = `https://search.google.com/local/writereview?placeid=${googlePlaceId}`;
  }

  if (!googleReviewUrl) {
    return {
      error:
        "Please provide your direct Google Review URL or your Google Place ID.",
    };
  }

  const isGoogleReview =
    /search\.google\.com\/local\/writereview|g\.page\/r\/|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps/.test(
      googleReviewUrl,
    );
  if (!isGoogleReview) {
    return {
      error:
        "Provide a direct Google review link, e.g. search.google.com/local/writereview?placeid=… or g.page/r/…/review.",
    };
  }

  const finalSlug = slugify(slug);
  if (!finalSlug) {
    return { error: "Slug must contain letters or numbers." };
  }

  const values = {
    name,
    slug: finalSlug,
    google_review_url: googleReviewUrl,
    google_place_id: googlePlaceId || null,
    phone: phone || null,
    logo_url: logoUrl || null,
    min_google_rating: Math.min(5, Math.max(1, minRating || 4)),
    owner_id: user.id,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    const { error: updateErr } = await supabase
      .from("businesses")
      .update(values)
      .eq("id", existing.id);

    if (updateErr) {
      if (updateErr.code === "23505") {
        return { error: "That slug is already taken. Choose another." };
      }
      return { error: updateErr.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath(`/r/${finalSlug}`);
    return { success: true, message: "Settings saved successfully." };
  } else {
    const { data: inserted, error: insertErr } = await supabase
      .from("businesses")
      .insert(values)
      .select("id")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return { error: "That slug is already taken. Choose another." };
      }
      return { error: insertErr.message };
    }

    // Initialize 14-day free trial subscription
    const trialEnd = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    try {
      await supabase.from("subscriptions").insert({
        business_id: inserted.id,
        status: "trialing",
        current_period_end: trialEnd,
      });
    } catch (subErr) {
      console.error("Failed to seed initial trial subscription:", subErr);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    return {
      success: true,
      redirect: "/dashboard",
      message: "Business setup complete!",
    };
  }
}
