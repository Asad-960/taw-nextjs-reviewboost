export type FeedbackStatus = "new" | "contacted" | "resolved";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export type FunnelEventType =
  | "page_view"
  | "positive_redirect"
  | "negative_submission";

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  google_place_id: string | null;
  google_review_url: string;
  logo_url: string | null;
  phone: string | null;
  min_google_rating: number;
  created_at: string;
  updated_at: string;
}

export interface PrivateFeedback {
  id: string;
  business_id: string;
  customer_name: string;
  customer_contact: string;
  rating: number;
  message: string;
  status: FeedbackStatus;
  notes: string | null;
  created_at: string;
}

export interface SmsCampaign {
  id: string;
  business_id: string;
  recipient_name: string;
  recipient_phone: string;
  twilio_message_sid: string | null;
  status: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  created_at: string;
}
