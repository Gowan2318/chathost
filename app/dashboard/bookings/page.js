import { redirect } from "next/navigation";
import { adminClient } from "../../../lib/supabase-admin";
import { getServerUser } from "../../../lib/supabase-server";
import { isFounder } from "../../../lib/founder";
import BookingsClient from "./BookingsClient";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BookingsPage({ searchParams }) {
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
  const ownedClientIds = chatbots.map((c) => c.client_id);

  // Optional ?client_id= scoping — lets an account with more than one
  // chatbot (the founder, demoing prospects) show just ONE client's
  // bookings instead of every client combined. `requestedClientId` is only
  // ever trusted once it's found inside `ownedClientIds`, which came from
  // the chatbots query above already filtered to .eq("user_id", user.id) —
  // so a client_id this user doesn't own can never narrow the query; it's
  // silently ignored and the normal combined view is shown instead.
  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedClientId =
    typeof resolvedSearchParams.client_id === "string" ? resolvedSearchParams.client_id : null;
  const scopedClientId =
    requestedClientId && UUID_RE.test(requestedClientId) && ownedClientIds.includes(requestedClientId)
      ? requestedClientId
      : null;

  const clientIds = scopedClientId ? [scopedClientId] : ownedClientIds;

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

  // No business column needed when scoped to a single client — there's
  // only one business in the list either way.
  const showBusinessName = !scopedClientId && chatbots.length > 1;

  return (
    <BookingsClient
      email={user.email}
      isFounder={userIsFounder}
      bookings={bookingsWithBusinessName}
      showBusinessName={showBusinessName}
    />
  );
}
