import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "../../lib/supabase-server";
import { isFounder } from "../../lib/founder";
import { buildAdminStats } from "../../lib/admin-stats";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}

export default async function AdminPage() {
  const user = await getServerUser();

  // Server-side gate: unauthenticated users and anyone but the founder are
  // redirected before any admin data is fetched or rendered.
  if (!user || !isFounder(user.email)) {
    redirect("/dashboard");
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
