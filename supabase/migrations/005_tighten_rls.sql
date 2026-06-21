-- Tighten chatbots table RLS: remove IS NULL loopholes and enforce NOT NULL on user_id.
--
-- Pre-flight: delete the 5 orphan dev/test rows (all inactive, created before auth was wired up).
-- The NOT NULL constraint below would fail if these rows remained.
DELETE FROM public.chatbots WHERE user_id IS NULL;

-- Make user_id mandatory going forward.
ALTER TABLE public.chatbots ALTER COLUMN user_id SET NOT NULL;

-- Drop all existing INSERT policies (both the migration-created and UI-created variants).
DROP POLICY IF EXISTS "chatbots_insert"         ON public.chatbots;
DROP POLICY IF EXISTS "Auth scoped insert"       ON public.chatbots;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chatbots;

-- Drop all existing UPDATE policies.
DROP POLICY IF EXISTS "chatbots_update"          ON public.chatbots;
DROP POLICY IF EXISTS "Auth scoped update"       ON public.chatbots;
DROP POLICY IF EXISTS "Enable update for users based on user_id"  ON public.chatbots;

-- Drop duplicate SELECT policy left over from UI creation (keep chatbots_select_public).
DROP POLICY IF EXISTS "Public read" ON public.chatbots;

-- Strict INSERT: authenticated user must own the row they are inserting.
CREATE POLICY "chatbots_insert"
  ON public.chatbots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Strict UPDATE: authenticated user must own the row they are updating.
CREATE POLICY "chatbots_update"
  ON public.chatbots
  FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
