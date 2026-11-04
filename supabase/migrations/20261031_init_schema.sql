-- ============================================================
-- ReviewBoost — Initial Schema & RLS Policies
-- Run in Supabase SQL Editor (or `supabase db push`).
-- ============================================================

-- 1. Extensions & Enums
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE feedback_status AS ENUM ('new', 'contacted', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Business Tenants
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    google_place_id TEXT,
    google_review_url TEXT NOT NULL,
    logo_url TEXT,
    phone TEXT,
    min_google_rating INT DEFAULT 4 CHECK (min_google_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Stripe Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL UNIQUE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    status subscription_status DEFAULT 'trialing' NOT NULL,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Funnel Analytics
CREATE TABLE IF NOT EXISTS public.funnel_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'positive_redirect', 'negative_submission')),
    rating_selected INT CHECK (rating_selected BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Private Negative Feedback (1–3 stars)
CREATE TABLE IF NOT EXISTS public.private_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_contact TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    message TEXT NOT NULL,
    status feedback_status DEFAULT 'new' NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. SMS Dispatch Records
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT NOT NULL,
    twilio_message_sid TEXT,
    status TEXT DEFAULT 'sent' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Indexes for dashboard aggregations
CREATE INDEX IF NOT EXISTS idx_funnel_events_business_type
  ON public.funnel_events (business_id, event_type);
CREATE INDEX IF NOT EXISTS idx_private_feedbacks_business_status
  ON public.private_feedbacks (business_id, status);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_business_created
  ON public.sms_campaigns (business_id, created_at DESC);

-- 8. Auto-update businesses.updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9. Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

-- 10. Business Owner RLS Policies
DROP POLICY IF EXISTS "Owners can view and manage their business" ON public.businesses;
CREATE POLICY "Owners can view and manage their business"
    ON public.businesses FOR ALL
    TO authenticated
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can view their subscription" ON public.subscriptions;
CREATE POLICY "Owners can view their subscription"
    ON public.subscriptions FOR SELECT
    TO authenticated
    USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can view their analytics events" ON public.funnel_events;
CREATE POLICY "Owners can view their analytics events"
    ON public.funnel_events FOR SELECT
    TO authenticated
    USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can view and update their private feedbacks" ON public.private_feedbacks;
CREATE POLICY "Owners can view and update their private feedbacks"
    ON public.private_feedbacks FOR ALL
    TO authenticated
    USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners can view and create SMS campaigns" ON public.sms_campaigns;
CREATE POLICY "Owners can view and create SMS campaigns"
    ON public.sms_campaigns FOR ALL
    TO authenticated
    USING (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()))
    WITH CHECK (business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid()));

-- 11. Public Funnel Policies (Accessible to both anon visitors and authenticated users testing the funnel)
DROP POLICY IF EXISTS "Public can view business details for review funnel" ON public.businesses;
CREATE POLICY "Public can view business details for review funnel"
    ON public.businesses FOR SELECT
    TO public
    USING (true);

DROP POLICY IF EXISTS "Public can record funnel events" ON public.funnel_events;
CREATE POLICY "Public can record funnel events"
    ON public.funnel_events FOR INSERT
    TO public
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can submit private feedback" ON public.private_feedbacks;
CREATE POLICY "Public can submit private feedback"
    ON public.private_feedbacks FOR INSERT
    TO public
    WITH CHECK (true);
