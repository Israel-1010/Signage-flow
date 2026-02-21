import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: player, error } = await supabase
      .from("players")
      .select(`
        *,
        current_playlist:playlists!default_playlist_id (
          id,
          name,
          playlist_items (
            id,
            position,
            duration,
            asset:assets (
              id,
              name,
              url,
              type
            )
          )
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error fetching player:", error);
    return NextResponse.json({ error: "Failed to fetch player" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      default_playlist_id,
      status,
      unlock_device,
      resolution,
      orientation,
      rss_enabled,
      rss_feed_url,
      rss_display_type,
      rss_update_interval,
      rss_slot_duration,
      rss_slot_every,
    } = body;

    const updateData: Record<string, string | number | boolean | null> = {};
    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (default_playlist_id !== undefined) updateData.default_playlist_id = default_playlist_id;
    if (status !== undefined) updateData.status = status;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (orientation !== undefined) updateData.orientation = orientation;
    if (rss_enabled !== undefined) updateData.rss_enabled = rss_enabled;
    if (rss_feed_url !== undefined) updateData.rss_feed_url = rss_feed_url;
    if (rss_display_type !== undefined) updateData.rss_display_type = rss_display_type;
    if (rss_update_interval !== undefined) updateData.rss_update_interval = rss_update_interval;
    if (rss_slot_duration !== undefined) updateData.rss_slot_duration = rss_slot_duration;
    if (rss_slot_every !== undefined) updateData.rss_slot_every = rss_slot_every;
    
    // Handle device unlock - clear the device token to allow a new device to connect
    if (unlock_device) {
      updateData.device_token = null;
      updateData.device_locked_at = null;
    }

    const tryUpdate = async (payload: Record<string, any>) =>
      await supabase
        .from("players")
        .update(payload)
        .eq("id", id)
        .eq("user_id", user.id)
        .select(`
          *,
          current_playlist:playlists!default_playlist_id (
            id,
            name
          )
        `)
        .single();

    let { data: player, error } = await tryUpdate(updateData);

    // Fallback if RSS columns are missing
    if (error && error.message.includes("rss_")) {
      const safePayload = stripRssFields(updateData);
      const retry = await tryUpdate(safePayload);
      player = retry.data;
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ player });
  } catch (error) {
    console.error("Error updating player:", error);
    return NextResponse.json({ error: "Failed to update player" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("players")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting player:", error);
    return NextResponse.json({ error: "Failed to delete player" }, { status: 500 });
  }
}
