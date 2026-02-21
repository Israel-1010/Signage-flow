import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("user_id", user.id)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const body = await request.json();
    const { 
      asset_id, 
      duration = 10, 
      valid_from, 
      valid_until,
    } = body;

    if (!asset_id) {
      return NextResponse.json({ error: "Apenas mídias podem ser adicionadas. Configure RSS no player." }, { status: 400 });
    }

    // Get the highest position in the playlist
    const { data: existingItems } = await supabase
      .from("playlist_items")
      .select("position")
      .eq("playlist_id", playlistId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPosition = existingItems && existingItems.length > 0 
      ? existingItems[0].position + 1 
      : 0;

    const insertData: any = {
      playlist_id: playlistId,
      position: nextPosition,
      duration,
      valid_from: valid_from || null,
      valid_until: valid_until || null,
    };

    insertData.asset_id = asset_id;

    const { data: item, error } = await supabase
      .from("playlist_items")
      .insert(insertData)
      .select(`
        id,
        position,
        duration,
        valid_from,
        valid_until,
        rss_feed_url,
        rss_display_type,
        rss_update_interval,
        asset:assets (
          id,
          name,
          url,
          type
        )
      `)
      .single();

    if (error) {
      console.error("[v0] Supabase insert error:", error);
      return NextResponse.json({ error: error.message || "Failed to insert item" }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error adding playlist item:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: playlistId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify playlist ownership
    const { data: playlist, error: playlistError } = await supabase
      .from("playlists")
      .select("id")
      .eq("id", playlistId)
      .eq("user_id", user.id)
      .single();

    if (playlistError || !playlist) {
      return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
    }

    const body = await request.json();
    const { items } = body; // Array of { id, position, duration }

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    // Update each item's position
    for (const item of items) {
      const { error } = await supabase
        .from("playlist_items")
        .update({ position: item.position, duration: item.duration })
        .eq("id", item.id)
        .eq("playlist_id", playlistId);

      if (error) {
        console.error("Error updating item:", error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reordering playlist items:", error);
    return NextResponse.json({ error: "Failed to reorder items" }, { status: 500 });
  }
}
