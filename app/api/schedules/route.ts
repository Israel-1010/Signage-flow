import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: schedules, error } = await supabase
      .from("schedules")
      .select(`
        *,
        player:players (
          id,
          name,
          location
        ),
        playlist:playlists (
          id,
          name
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
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
    const { name, player_id, playlist_id, start_time, end_time, days_of_week, is_active } = body;

    if (!name || !player_id || !playlist_id) {
      return NextResponse.json({ error: "Name, player, and playlist are required" }, { status: 400 });
    }

    const { data: schedule, error } = await supabase
      .from("schedules")
      .insert({
        user_id: user.id,
        name,
        player_id,
        playlist_id,
        start_time: start_time || "00:00",
        end_time: end_time || "23:59",
        days_of_week: days_of_week || [0, 1, 2, 3, 4, 5, 6],
        is_active: is_active ?? true,
      })
      .select(`
        *,
        player:players (
          id,
          name,
          location
        ),
        playlist:playlists (
          id,
          name
        )
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
  }
}
