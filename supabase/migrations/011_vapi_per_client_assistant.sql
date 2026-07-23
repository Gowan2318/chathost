-- Per-client Vapi voice assistants — each client gets their own Vapi
-- assistant (and, later, their own provisioned phone number) instead of all
-- clients sharing one assistant resource.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push
--
-- COST SAFETY: this migration itself is free (it's just schema). The
-- vapi_assistant_id column is populated by scripts/sync-vapi-assistant.js,
-- which only creates/patches Vapi assistants — also free. vapi_phone_number
-- is added now but left NULL/unused until a later, separate, manual-only
-- script provisions actual phone numbers (~$2/mo each). Nothing in this step
-- creates or reserves a phone number.

ALTER TABLE public.chatbots
ADD COLUMN IF NOT EXISTS vapi_assistant_id text,
ADD COLUMN IF NOT EXISTS vapi_phone_number text;

-- No RLS changes needed — these are just additional columns on chatbots,
-- covered by the existing policies from migrations 002/005/006 (service role
-- writes via scripts/sync-vapi-assistant.js, anon SELECT for the widget,
-- authenticated SELECT scoped to auth.uid() = user_id).
