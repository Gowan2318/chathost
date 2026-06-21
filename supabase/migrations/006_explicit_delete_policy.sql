-- 1. Explicitly block all deletes from anon and authenticated roles.
--    (RLS implicit deny already blocks this, but explicit policy documents intent.)
CREATE POLICY "Disable delete for all users"
  ON public.chatbots
  FOR DELETE
  USING (false);

-- 2. Tighten SELECT: split the open policy into role-scoped policies.
--    Drop the existing open policy (created by migration 002).
DROP POLICY IF EXISTS "chatbots_select_public" ON public.chatbots;

-- Authenticated users can only read their own chatbot rows.
CREATE POLICY "Authenticated users see own chatbots"
  ON public.chatbots
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anon role retains full read access (required for /api/widget which uses the anon key).
CREATE POLICY "Public read for widget"
  ON public.chatbots
  FOR SELECT
  TO anon
  USING (true);
