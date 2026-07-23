-- Bookings/messages captured by the voice receptionist (Vapi).
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push
--
-- COST SAFETY: this table and the assistant sync (scripts/sync-vapi-assistant.js)
-- are FREE — no phone numbers, no standing cost. Phone number provisioning
-- (the only thing that costs ~$2/mo) is deliberately NOT part of this step —
-- it will be a separate, manual-only script added later. Nothing here
-- creates or reserves a phone number.

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.chatbots(client_id) ON DELETE CASCADE,
  caller_name text,
  caller_phone text,
  service text,
  requested_time text,
  type text NOT NULL CHECK (type IN ('booking', 'message')),
  call_id text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_bookings_client_id ON public.bookings(client_id, created_at DESC);

-- RLS policies
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Service role only (no direct client access) — data is written server-side
-- only, via the Vapi webhook / sync script, matching leads/conversations/etc.
