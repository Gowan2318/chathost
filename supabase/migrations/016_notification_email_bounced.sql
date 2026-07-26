-- Flags a chatbots row whose notification address (the owner's Supabase Auth
-- email) bounced or triggered a spam complaint, per app/api/resend-webhook/route.js.
-- Lets the admin dashboard eventually surface "this client's email is
-- bouncing" instead of relying solely on the founder-alert email.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push
--
-- COST SAFETY: schema-only change, free.

ALTER TABLE public.chatbots
ADD COLUMN IF NOT EXISTS notification_email_bounced boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS notification_email_bounced_at timestamptz,
ADD COLUMN IF NOT EXISTS notification_email_bounce_type text;

-- No RLS changes needed — additional columns on chatbots, covered by the
-- existing policies from migrations 002/005/006.
