import { redirect } from "next/navigation";
import { adminClient } from "../../../lib/supabase-admin";
import { getServerUser } from "../../../lib/supabase-server";
import { isFounder } from "../../../lib/founder";
import BookingsClient from "./BookingsClient";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  const userIsFounder = isFounder(user.email);

  const db = adminClient();

  const { data: chatbots } = await db
    .from("chatbots")
    .select("client_id, config")
    .eq("user_id", user.id);

  if (!chatbots || chatbots.length === 0) {
    return <BookingsClient email={user.email} isFounder={userIsFounder} bookings={null} />;
  }

  const businessNameByClientId = Object.fromEntries(
    chatbots.map((c) => [c.client_id, c.config?.businessName ?? null])
  );
  const clientIds = chatbots.map((c) => c.client_id);

  const { data: bookings, error } = await db
    .from("bookings")
    .select("id, client_id, caller_name, caller_phone, service, requested_time, type, status, created_at")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[bookings] query failed:", error);
  }

  const bookingsWithBusinessName = (bookings ?? []).map((booking) => ({
    ...booking,
    businessName: businessNameByClientId[booking.client_id] ?? null,
  }));

  const showBusinessName = chatbots.length > 1;

  return (
    <BookingsClient
      email={user.email}
      isFounder={userIsFounder}
      bookings={bookingsWithBusinessName}
      showBusinessName={showBusinessName}
    />
  );
}
