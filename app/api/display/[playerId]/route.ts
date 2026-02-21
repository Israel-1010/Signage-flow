import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PlaylistItem {
  id: string;
  position: number;
  duration: number;
  valid_from: string | null;
  valid_until: string | null;
  rss_feed_url: string | null;
  rss_display_type: string | null;
  rss_update_interval: number | null;
  asset: {
    id: string;
    name: string;
    url: string;
    type: string;
  } | null;
}

// Filter out expired items and items not yet valid
function filterValidItems(items: PlaylistItem[]): PlaylistItem[] {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  return items.filter(item => {
    // Check if item has started (valid_from)
    if (item.valid_from && item.valid_from > today) {
      return false;
    }
    
    // Check if item has expired (valid_until)
    if (item.valid_until && item.valid_until < today) {
      return false;
    }
    
    return true;
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ playerId: string }> }
) {
  try {
    const { playerId } = await params;
    const deviceToken = request.headers.get("x-device-token");
    const supabase = await createClient();

    const selectWithRss = `
        id,
        name,
        status,
        default_playlist_id,
        device_token,
        resolution,
        orientation,
        rss_enabled,
        rss_feed_url,
        rss_display_type,
        rss_update_interval,
        rss_slot_duration,
        rss_slot_every,
        current_playlist:playlists!default_playlist_id (
          id,
          name,
          playlist_items (
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
          )
        )
      `;

    const selectWithoutRss = `
        id,
        name,
        status,
        default_playlist_id,
        device_token,
        resolution,
        orientation,
        current_playlist:playlists!default_playlist_id (
          id,
          name,
          playlist_items (
            id,
            position,
            duration,
            valid_from,
            valid_until,
            asset:assets (
              id,
              name,
              url,
              type
            )
          )
        )
      `;

    let { data: player, error: playerError } = await supabase
      .from("players")
      .select(selectWithRss)
      .eq("id", playerId)
      .single();

    if (playerError && playerError.message.includes("rss_")) {
      const retry = await supabase
        .from("players")
        .select(selectWithoutRss)
        .eq("id", playerId)
        .single();
      player = retry.data;
      playerError = retry.error;
    }

    if (playerError || !player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Single device lock logic
    if (!deviceToken) {
      return NextResponse.json({ error: "Device token required" }, { status: 400 });
    }

    // If player has no device token, lock it to this device
    if (!player.device_token) {
      await supabase
        .from("players")
        .update({
          device_token: deviceToken,
          device_locked_at: new Date().toISOString(),
          last_ping: new Date().toISOString(),
          status: "online",
        })
        .eq("id", playerId);
    } else if (player.device_token !== deviceToken) {
      // Device token mismatch - another device is using this player
      return NextResponse.json({ 
        error: "Este player já está em uso em outro dispositivo. Desbloqueie-o no painel para usar aqui.",
        code: "DEVICE_LOCKED"
      }, { status: 403 });
    } else {
      // Same device, just update heartbeat
      await supabase
        .from("players")
        .update({
          last_ping: new Date().toISOString(),
          status: "online",
        })
        .eq("id", playerId);
    }

    // Sort and filter playlist items by position
    let activePlaylist = player.current_playlist;
    if (activePlaylist?.playlist_items) {
      // Sort by position
      activePlaylist.playlist_items.sort(
        (a: { position: number }, b: { position: number }) => a.position - b.position
      );
      
      // Filter out expired/not yet valid items
      activePlaylist.playlist_items = filterValidItems(activePlaylist.playlist_items as PlaylistItem[]);
    }

    return NextResponse.json({
      player: {
        id: player.id,
        name: player.name,
        resolution: player.resolution || "1920x1080",
        orientation: player.orientation || "landscape",
        rss_enabled: player.rss_enabled ?? false,
        rss_feed_url: player.rss_feed_url || null,
        rss_display_type: player.rss_display_type || "card",
        rss_update_interval: player.rss_update_interval || 300,
        rss_slot_duration: player.rss_slot_duration || 10,
        rss_slot_every: player.rss_slot_every || 2,
      },
      playlist: activePlaylist,
    });
  } catch (error) {
    console.error("Error fetching display data:", error);
    return NextResponse.json({ error: "Failed to fetch display data" }, { status: 500 });
  }
}
