-- Tiered voice plans with hard caps and auto-pause. Reuses the existing
-- voice_minutes_limit / voice_minutes_used / voice_minutes_reset_at columns
-- from migration 012 — this migration only adds the plan label and the
-- paused flag. Plan -> limit mapping lives in lib/plans.js (VOICE_PLANS),
-- not in the database.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push
--
-- COST SAFETY: schema-only change, free. No phone numbers are provisioned
-- by this migration.

ALTER TABLE public.chatbots
ADD COLUMN IF NOT EXISTS voice_plan text,
ADD COLUMN IF NOT EXISTS voice_paused boolean NOT NULL DEFAULT false;

ALTER TABLE public.chatbots DROP CONSTRAINT IF EXISTS chatbots_voice_plan_check;
ALTER TABLE public.chatbots
ADD CONSTRAINT chatbots_voice_plan_check
  CHECK (voice_plan IS NULL OR voice_plan IN ('starter', 'growth', 'pro'));

-- No RLS changes needed — these are just additional columns on chatbots,
-- covered by the existing policies from migrations 002/005/006 (service role
-- writes via the Vapi webhook / setup scripts, anon SELECT for the widget,
-- authenticated SELECT scoped to auth.uid() = user_id).
