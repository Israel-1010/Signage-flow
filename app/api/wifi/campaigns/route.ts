import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CampaignPayload = {
  name?: string;
  headline?: string;
  description?: string;
  cta_label?: string;
  cta_url?: string;
  banner_url?: string;
  status?: string;
  start_at?: string | null;
  end_at?: string | null;
  priority?: number;
  target_auth_providers?: string[];
  target_device_types?: string[];
  max_impressions_per_session?: number | null;
};

function isTableMissing(errorMessage?: string) {
  const message = (errorMessage || "").toLowerCase();
  return message.includes("wifi_campaigns") && message.includes("does not exist");
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function sanitizeUrl(value?: string) {
  const url = value?.trim() || "";
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return "";
}

function normalizeArray(values?: string[]) {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
}

function normalizeStatus(status?: string) {
  if (status === "active" || status === "paused" || status === "ended") {
    return status;
  }
  return "draft";
}

function mapCampaignPayload(userId: string, body: CampaignPayload) {
  return {
    user_id: userId,
    name: (body.name || "").trim().slice(0, 140) || "Nova campanha",
    headline: (body.headline || "").trim().slice(0, 180) || null,
    description: (body.description || "").trim().slice(0, 800) || null,
    cta_label: (body.cta_label || "").trim().slice(0, 60) || "Saiba mais",
    cta_url: sanitizeUrl(body.cta_url) || null,
    banner_url: sanitizeUrl(body.banner_url) || null,
    status: normalizeStatus(body.status),
    start_at: parseDate(body.start_at),
    end_at: parseDate(body.end_at),
    priority: Number.isFinite(body.priority) ? Math.max(Math.floor(body.priority as number), 0) : 100,
    target_auth_providers: normalizeArray(body.target_auth_providers),
    target_device_types: normalizeArray(body.target_device_types),
    max_impressions_per_session:
      typeof body.max_impressions_per_session === "number" &&
      body.max_impressions_per_session > 0
        ? Math.floor(body.max_impressions_per_session)
        : null,
    updated_at: new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = req.nextUrl.searchParams.get("status") || "all";

    let query = supabase
      .from("wifi_campaigns")
      .select("*")
      .eq("user_id", user.id)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      if (isTableMissing(error.message)) {
        return NextResponse.json({
          campaigns: [],
          warning:
            "Table wifi_campaigns not found. Run the SQL migration before using this screen.",
        });
      }
      throw new Error(error.message);
    }

    let eventCounts: Record<
      string,
      { impressions: number; clicks: number }
    > = {};

    const eventsResult = await supabase
      .from("wifi_campaign_events")
      .select("campaign_id,event_type")
      .eq("user_id", user.id)
      .limit(20000);

    if (!eventsResult.error && eventsResult.data) {
      eventCounts = eventsResult.data.reduce<
        Record<string, { impressions: number; clicks: number }>
      >((acc, event) => {
        if (!acc[event.campaign_id]) {
          acc[event.campaign_id] = { impressions: 0, clicks: 0 };
        }
        if (event.event_type === "impression") {
          acc[event.campaign_id].impressions += 1;
        }
        if (event.event_type === "click") {
          acc[event.campaign_id].clicks += 1;
        }
        return acc;
      }, {});
    }

    const now = Date.now();
    const campaigns = (data || []).map((campaign) => {
      const startAt = campaign.start_at ? new Date(campaign.start_at).getTime() : null;
      const endAt = campaign.end_at ? new Date(campaign.end_at).getTime() : null;

      const inWindow =
        (startAt === null || startAt <= now) && (endAt === null || endAt >= now);
      const isDraft = campaign.status === "draft";
      const isPaused = campaign.status === "paused";
      const isEnded = campaign.status === "ended" || (endAt !== null && endAt < now);
      const lifecycle =
        isEnded ? "ended" : isDraft ? "draft" : isPaused ? "paused" : inWindow ? "active" : "scheduled";

      const stats = eventCounts[campaign.id];
      const impressions = Number(stats?.impressions ?? campaign.impressions_count ?? 0);
      const clicks = Number(stats?.clicks ?? campaign.clicks_count ?? 0);
      const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;

      return {
        ...campaign,
        lifecycle,
        ctr,
      };
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("[wifi/campaigns] get", error);
    return NextResponse.json(
      { error: "Failed to load campaigns" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as CampaignPayload;
    const payload = {
      ...mapCampaignPayload(user.id, body),
      impressions_count: 0,
      clicks_count: 0,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("wifi_campaigns")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    console.error("[wifi/campaigns] create", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 },
    );
  }
}
