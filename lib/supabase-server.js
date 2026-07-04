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
