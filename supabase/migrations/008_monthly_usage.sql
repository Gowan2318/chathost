-- Monthly message usage tracking for plan limits (Basic 500/mo, Pro 1500/mo)
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push

ALTER TABLE chatbots
ADD COLUMN IF NOT EXISTS monthly_message_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_reset_date date DEFAULT date_trunc('month', now())::date;
