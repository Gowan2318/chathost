-- Phase 4: add Stripe billing fields to chatbots table
-- Run in Supabase Dashboard → SQL Editor → New query

ALTER TABLE public.chatbots
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';

-- The webhook handler uses the service role key which bypasses RLS,
-- so no policy changes are needed for these columns.
