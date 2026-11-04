import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTwilioClient, isE164 } from "@/lib/twilio/twilio";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json(
      { error: "Set up your business before sending SMS." },
      { status: 400 },
    );
  }

  // Feature protection: Verify active or trialing subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", business.id)
    .maybeSingle();

  const isRecentBusiness =
    Date.now() - new Date(business.created_at).getTime() <
    14 * 24 * 60 * 60 * 1000;
  const isAllowed =
    sub?.status === "active" ||
    sub?.status === "trialing" ||
    (!sub && isRecentBusiness);

  if (!isAllowed) {
    return NextResponse.json(
      {
        error:
          "An active subscription or free trial is required to dispatch SMS campaigns. Please visit Billing to subscribe.",
      },
      { status: 403 },
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const recipientName = String(body.recipientName ?? "").trim();
  const recipientPhone = String(body.recipientPhone ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!recipientName) {
    return NextResponse.json(
      { error: "Recipient name is required." },
      { status: 400 },
    );
  }
  if (!isE164(recipientPhone)) {
    return NextResponse.json(
      { error: "Phone must be in E.164 format (e.g. +14155552671)." },
      { status: 400 },
    );
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
  const reviewUrl = `${appUrl}/r/${business.slug}`;

  // Preserve review link in all customized messages
  let text: string;
  if (message) {
    if (message.includes("{link}")) {
      text = message.replaceAll("{link}", reviewUrl);
    } else if (!message.includes(reviewUrl)) {
      text = `${message} ${reviewUrl}`;
    } else {
      text = message;
    }
  } else {
    text = `Hi ${recipientName}, thank you for choosing ${business.name}! Please take 15 seconds to let us know how we did: ${reviewUrl}`;
  }

  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) {
    return NextResponse.json(
      {
        error:
          "TWILIO_PHONE_NUMBER is not set. Configure it in .env.local to send SMS.",
      },
      { status: 500 },
    );
  }

  try {
    const client = getTwilioClient();
    const twilioMsg = await client.messages.create({
      body: text,
      from: fromNumber,
      to: recipientPhone,
    });

    const { error } = await supabase.from("sms_campaigns").insert({
      business_id: business.id,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      twilio_message_sid: twilioMsg.sid,
      status: "sent",
    });

    if (error) {
      console.error("Failed to record SMS campaign:", error.message);
    }

    return NextResponse.json({ success: true, sid: twilioMsg.sid });
  } catch (err: any) {
    console.error("Twilio send error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to send SMS via Twilio." },
      { status: 500 },
    );
  }
}
