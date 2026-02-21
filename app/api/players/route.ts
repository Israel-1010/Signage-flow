import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: players, error } = await supabase
      .from("players")
      .select(`
        *,
        current_playlist:playlists!default_playlist_id (
          id,
          name,
          playlist_items (
            position,
            asset:assets (
              id,
              name,
              url,
              type
            )
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 });
  }
}

function stripRssFields(obj: Record<string, any>) {
  const clone = { ...obj };
  Object.keys(clone).forEach((k) => {
    if (k.startsWith("rss_")) delete clone[k];
  });
  return clone;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      location,
      resolution,
      orientation,
      rss_enabled = false,
      rss_feed_url = null,
      rss_display_type = "card",
      rss_update_interval = 300,
      rss_slot_duration = 10,
      rss_slot_every = 2,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Generate a unique pairing code
    const pairingCode = randomBytes(4).toString("hex").toUpperCase();

    const insertPayload = {
      user_id: user.id,
      name,
      location: location || null,
      code: pairingCode,
      status: "offline",
      resolution: resolution || "1920x1080",
      orientation: orientation || "landscape",
      rss_enabled,
      rss_feed_url,
      rss_display_type,
      rss_update_interval,
      rss_slot_duration,
      rss_slot_every,
    };

    let { data: player, error } = await supabase
      .from("players")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback if RSS columns are missing in the schema
    if (error && error.message.includes("rss_")) {
      const safePayload = stripRssFields(insertPayload);
      const retry = await supabase
        .from("players")
        .insert(safePayload)
        .select()
        .single();
      player = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error creating player:", error);
    return NextResponse.json({ error: "Failed to create player" }, { status: 500 });
  }
}
