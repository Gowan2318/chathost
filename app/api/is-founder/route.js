import { NextResponse } from "next/server";
import { getServerUser } from "../../../lib/supabase-server";
import { isFounder } from "../../../lib/founder";

export const runtime = "nodejs";

// Cookie-authenticated — lets client components check founder status without
// FOUNDER_EMAIL ever reaching the browser bundle.
export async function GET() {
  const user = await getServerUser();
  return NextResponse.json({ isFounder: isFounder(user?.email) });
}
