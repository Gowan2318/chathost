-- Top-of-funnel demo request intake (app/demo-request). No account, no
-- payment — a prospect submits their info, the founder reviews it in
-- Supabase/email and builds their demo manually.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push

CREATE TABLE public.demo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- About you — how we reach the prospect
  contact_name text,
  contact_email text,
  contact_phone text,
  -- About their business — what the AI receptionist will know
  business_name text,
  business_phone text,
  business_website text,
  industry text,
  business_description text,
  services text,
  hours text,
  service_area text,
  has_website boolean,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_demo_requests_created_at ON public.demo_requests(created_at DESC);
CREATE INDEX idx_demo_requests_status ON public.demo_requests(status);

-- RLS policies
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Service role only (no client policies) — data is written server-side only,
-- via app/api/demo-request, matching bookings/rate_limit_log/blocked_ips.
