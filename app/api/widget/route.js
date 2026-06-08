import { NextResponse } from "next/server";
import { getSupabaseClient } from "../../../lib/supabase";

export async function GET(request) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("chatbots")
      .select("config")
      .eq("client_id", id.trim())
      .maybeSingle();

    if (error) {
      console.error("Supabase widget fetch error:", error);
      return NextResponse.json({ error: "Failed to load chatbot config" }, { status: 500 });
    }

    if (!data?.config) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    return NextResponse.json(data.config);
  } catch (err) {
    console.error("Widget API error:", err);
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
}
