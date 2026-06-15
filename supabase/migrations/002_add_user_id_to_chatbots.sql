-- Phase 2: link chatbots to user accounts
-- Run this in the Supabase SQL editor: Dashboard > SQL Editor > New query

-- 1. Add nullable user_id column (nullable preserves existing anonymous rows)
ALTER TABLE public.chatbots
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- 2. Ensure RLS is on
ALTER TABLE public.chatbots ENABLE ROW LEVEL SECURITY;

-- 3. Drop any pre-existing policies by common names so we can recreate cleanly
DROP POLICY IF EXISTS "chatbots_select_public"  ON public.chatbots;
DROP POLICY IF EXISTS "chatbots_insert"          ON public.chatbots;
DROP POLICY IF EXISTS "chatbots_update"          ON public.chatbots;
-- also drop default Supabase Studio names in case they were created via the UI
DROP POLICY IF EXISTS "Enable read access for all users"          ON public.chatbots;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chatbots;
DROP POLICY IF EXISTS "Enable update for users based on user_id"  ON public.chatbots;
DROP POLICY IF EXISTS "Public chatbots are viewable by everyone"  ON public.chatbots;

-- 4. SELECT - unrestricted; the /api/widget route reads configs by client_id with the anon key
CREATE POLICY "chatbots_select_public"
  ON public.chatbots
  FOR SELECT
  USING (true);

-- 5. INSERT - allow when user_id is null (legacy/test rows) OR matches the authenticated caller
CREATE POLICY "chatbots_insert"
  ON public.chatbots
  FOR INSERT
  WITH CHECK (
    user_id IS NULL
    OR auth.uid() = user_id
  );

-- 6. UPDATE - same scoping as INSERT
CREATE POLICY "chatbots_update"
  ON public.chatbots
  FOR UPDATE
  USING  (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
