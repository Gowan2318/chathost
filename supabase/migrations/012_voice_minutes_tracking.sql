-- Per-client voice minute tracking and cap, for cost control on the Vapi
-- voice receptionist (~$0.20/min all-in). Usage is written server-side only,
-- via app/api/vapi-webhook/route.js handling Vapi's end-of-call-report event.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push
--
-- This is tracking/alerting only — no auto-pause yet. voice_minutes_limit
-- being null means "no limit" (unmetered); the webhook and admin dashboard
-- both treat null as unlimited rather than defaulting it to 0.

ALTER TABLE public.chatbots
ADD COLUMN IF NOT EXISTS voice_minutes_limit int DEFAULT 500,
ADD COLUMN IF NOT EXISTS voice_minutes_used numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_minutes_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now());

-- No RLS changes needed — these are just additional columns on chatbots,
-- covered by the existing policies from migrations 002/005/006 (service role
-- writes via the Vapi webhook, anon SELECT for the widget, authenticated
-- SELECT scoped to auth.uid() = user_id).
