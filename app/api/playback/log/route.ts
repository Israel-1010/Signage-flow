import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Payload = {
  playerId: string;
  playlistId?: string | null;
  itemId: string;
  itemType: "image" | "video" | "rss";
  title?: string | null;
  startedAt: string; // ISO
  duration?: number | null; // seconds
  status?: "started" | "ended" | "error";
  details?: Record<string, any>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Payload>;
    if (!body.playerId || !body.itemId || !body.itemType || !body.startedAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("playback_logs").insert({
      player_id: body.playerId,
      playlist_id: body.playlistId ?? null,
      item_id: body.itemId,
      item_type: body.itemType,
      title: body.title ?? null,
      started_at: body.startedAt,
      duration_seconds: body.duration ?? null,
      status: body.status ?? "started",
      details: body.details ?? null,
    });

    if (error) {
      console.error("[reporting] insert error", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reporting] unexpected", err);
    return NextResponse.json({ error: "Failed to log playback" }, { status: 500 });
  }
}
