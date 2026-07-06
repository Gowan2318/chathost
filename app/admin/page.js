import { redirect } from "next/navigation";
import { adminClient } from "../../lib/supabase-admin";
import { getServerAuthState } from "../../lib/supabase-server";
import { isFounder } from "../../lib/founder";
import { buildAdminStats } from "../../lib/admin-stats";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, aalLevel, hasVerifiedTotp } = await getServerAuthState();

  // Server-side gate: unauthenticated users and anyone but the founder are
  // redirected before any admin data is fetched or rendered.
  if (!user || !isFounder(user.email)) {
    redirect("/dashboard");
  }

  // A valid session isn't enough — the founder must have completed a TOTP
  // challenge this session (aal2), not just be logged in (aal1).
  if (aalLevel !== "aal2") {
    redirect(hasVerifiedTotp ? "/admin/verify" : "/admin/setup-mfa");
  }

  const db = adminClient();
  const { data, error } = await db
    .from("chatbots")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] failed to load chatbots:", error);
  }

  const stats = buildAdminStats(data ?? []);

  return <AdminDashboardClient email={user.email} stats={stats} fetchError={Boolean(error)} />;
}
