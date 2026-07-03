-- Subscription/billing-cycle tracking synced from Stripe.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push

ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
ADD COLUMN IF NOT EXISTS plan text;

ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS plan text;
