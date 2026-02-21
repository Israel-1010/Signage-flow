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

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function sanitizeUrl(value?: string) {
  const url = value?.trim() || "";
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return null;
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

function mapCampaignPayload(body: CampaignPayload) {
  return {
    name: (body.name || "").trim().slice(0, 140) || "Campanha",
    headline: (body.headline || "").trim().slice(0, 180) || null,
    description: (body.description || "").trim().slice(0, 800) || null,
    cta_label: (body.cta_label || "").trim().slice(0, 60) || "Saiba mais",
    cta_url: sanitizeUrl(body.cta_url),
    banner_url: sanitizeUrl(body.banner_url),
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const body = (await req.json()) as CampaignPayload;
    const payload = mapCampaignPayload(body);

    const { data, error } = await supabase
      .from("wifi_campaigns")
      .update(payload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ campaign: data });
  } catch (error) {
    console.error("[wifi/campaigns] update", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      .from("wifi_campaigns")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[wifi/campaigns] delete", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 },
    );
  }
}
