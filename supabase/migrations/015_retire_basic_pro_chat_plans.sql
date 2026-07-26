-- Retires the old $40/$60 "basic"/"pro" chat-only Stripe plans in favor of
-- the three voice-bundled plans (starter/growth/pro — see lib/plans.js
-- VOICE_PLANS). Zero customers exist on the old plans, so this is not a
-- data migration — just widening the two places that hard-CHECK plan
-- values to accept the new plan ids instead of the old ones.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push
--
-- COST SAFETY: schema-only change, free.

ALTER TABLE public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_plan_check;
ALTER TABLE public.payment_transactions
ADD CONSTRAINT payment_transactions_plan_check
  CHECK (plan IS NULL OR plan IN ('starter', 'growth', 'pro'));

-- chatbots.plan had no CHECK constraint before (added as a bare `text`
-- column in migration 009) — add one now so it can't silently drift from
-- the same three plan ids as chatbots.voice_plan (migration 014).
ALTER TABLE public.chatbots DROP CONSTRAINT IF EXISTS chatbots_plan_check;
ALTER TABLE public.chatbots
ADD CONSTRAINT chatbots_plan_check
  CHECK (plan IS NULL OR plan IN ('starter', 'growth', 'pro'));
