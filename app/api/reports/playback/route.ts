import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get("player_id");
    const dateFrom = searchParams.get("date_from"); // YYYY-MM-DD
    const dateTo = searchParams.get("date_to"); // YYYY-MM-DD

    const supabase = await createClient();

    let query = supabase
      .from("playback_logs")
      .select(
        "player_id, playlist_id, item_id, item_type, title, started_at, duration_seconds, status, details"
      )
      .order("started_at", { ascending: false })
      .limit(2000);

    if (playerId) query = query.eq("player_id", playerId);
    if (dateFrom) query = query.gte("started_at", `${dateFrom}T00:00:00Z`);
    if (dateTo) query = query.lte("started_at", `${dateTo}T23:59:59Z`);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Aggregate summary client-side
    const totalDuration =
      data?.reduce((acc, r) => acc + (r.duration_seconds ?? 0), 0) ?? 0;
    const byType =
      data?.reduce<Record<string, number>>((acc, r) => {
        acc[r.item_type] = (acc[r.item_type] ?? 0) + 1;
        return acc;
      }, {}) ?? {};

    return NextResponse.json({
      total: data?.length ?? 0,
      totalDurationSeconds: totalDuration,
      byType,
      items: data,
    });
  } catch (err) {
    console.error("[reporting] report fetch", err);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
