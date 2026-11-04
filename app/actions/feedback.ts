"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { FeedbackStatus } from "@/lib/types";

export async function submitPrivateFeedback(input: {
  businessId: string;
  customerName: string;
  customerContact: string;
  rating: number;
  message: string;
}) {
  const supabase = createClient();

  const customerName = (input.customerName ?? "").trim();
  const customerContact = (input.customerContact ?? "").trim();
  const message = (input.message ?? "").trim();
  const rating = Number(input.rating);

  if (!customerName || !customerContact || !message) {
    return { error: "Please fill in your name, contact, and message." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Invalid rating." };
  }

  // Re-validate the business exists before accepting a write.
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, phone")
    .eq("id", input.businessId)
    .single();

  if (!business) return { error: "Business not found." };

  const { error } = await supabase.from("private_feedbacks").insert({
    business_id: business.id,
    customer_name: customerName,
    customer_contact: customerContact,
    rating,
    message,
    status: "new",
  });

  if (error) return { error: error.message };

  try {
    await supabase.from("funnel_events").insert({
      business_id: business.id,
      event_type: "negative_submission",
      rating_selected: rating,
    });
  } catch (eventErr) {
    console.error("Failed to log negative_submission funnel event:", eventErr);
  }

  // Real-time Business Owner Alert via Twilio SMS (if owner phone & Twilio are configured)
  if (
    business.phone &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.TWILIO_ACCOUNT_SID
  ) {
    try {
      const { getTwilioClient, isE164 } = await import("@/lib/twilio/twilio");
      if (isE164(business.phone)) {
        const client = getTwilioClient();
        await client.messages.create({
          body: `[ReviewBoost Alert] ${business.name}: New ${rating}★ feedback received from ${customerName} (${customerContact}): "${message.slice(0, 100)}${message.length > 100 ? "…" : ""}". Check your inbox to triage.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: business.phone,
        });
      }
    } catch (smsErr) {
      console.error("Failed to send real-time owner alert SMS:", smsErr);
      // Non-blocking: feedback submission still succeeds
    }
  }

  return { success: true };
}

export async function logFunnelEvent(input: {
  businessId: string;
  eventType: "page_view" | "positive_redirect" | "negative_submission";
  rating?: number | null;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("funnel_events").insert({
    business_id: input.businessId,
    event_type: input.eventType,
    rating_selected: input.rating ?? null,
  });
  return { success: !error, error: error?.message };
}

export async function updateFeedbackStatus(input: {
  id: string;
  status: FeedbackStatus;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("private_feedbacks")
    .update({ status: input.status })
    .eq("id", input.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/feedback");
  return { success: true };
}
