-- Removes the anon SELECT policy on chatbots. Security audit finding: RLS
-- policies restrict rows, not columns — "Public read for widget" (migration
-- 006) was USING (true) for the anon role on the WHOLE table, so anyone with
-- the (necessarily public) NEXT_PUBLIC_SUPABASE_ANON_KEY could bypass
-- /api/widget's column restriction entirely and read every column of every
-- client's row directly via Supabase's REST API — stripe_customer_id,
-- stripe_subscription_id, vapi_assistant_id, vapi_phone_number, usage/billing
-- fields, etc. Verified live before this fix.
--
-- Both anon consumers of this table (app/api/widget/route.js and
-- app/demo/[clientId]/page.js) have been switched to the service-role client
-- in this same change, so dropping this policy doesn't break either.
-- Run in Supabase Dashboard → SQL Editor → New query, or via CLI:
--   supabase db push

DROP POLICY IF EXISTS "Public read for widget" ON public.chatbots;

-- No replacement anon policy — chatbots is now service-role-only for
-- unauthenticated reads, matching bookings/demo_requests/etc. The
-- "Authenticated users see own chatbots" policy (migration 006) is
-- untouched and still lets logged-in owners read their own row directly.
