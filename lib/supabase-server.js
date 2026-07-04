import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Server Component/Route Handler Supabase client, backed by request cookies. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — cookies can't be set here.
            // Middleware refreshes the session cookie on every request instead.
          }
        },
      },
    }
  );
}

/** Returns the authenticated user for the current request, or null. */
export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Returns the authenticated user plus their MFA state for the current
 * request — used to gate the admin dashboard behind a completed TOTP
 * challenge (aal2), not just a valid session.
 */
export async function getServerAuthState() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { user: null, aalLevel: null, hasVerifiedTotp: false };
  }

  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const hasVerifiedTotp = (factorsData?.totp ?? []).some((f) => f.status === "verified");

  return {
    user,
    aalLevel: aalData?.currentLevel ?? null,
    hasVerifiedTotp,
  };
}
