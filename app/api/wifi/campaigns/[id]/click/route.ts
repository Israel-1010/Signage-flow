import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getClientIp(req: NextRequest) {
  return (
    req.ip ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

function isCampaignLive(campaign: {
  status: string | null;
  start_at: string | null;
  end_at: string | null;
}) {
  if (campaign.status !== "active") return false;

  const now = Date.now();
  const startAt = campaign.start_at ? new Date(campaign.start_at).getTime() : null;
  const endAt = campaign.end_at ? new Date(campaign.end_at).getTime() : null;

  if (startAt !== null && startAt > now) return false;
  if (endAt !== null && endAt < now) return false;
  return true;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("wifi_campaigns")
    .select("id,user_id,status,start_at,end_at,cta_url")
    .eq("id", id)
    .maybeSingle();

  const redirectUrl = campaign?.cta_url || "/";

  if (!campaign || !isCampaignLive(campaign)) {
    return NextResponse.redirect(new URL(redirectUrl, req.url));
  }

  const portalToken = req.nextUrl.searchParams.get("portal_token");
  const userAgent = req.headers.get("user-agent");
  const ipAddress = getClientIp(req);

  await supabase
    .from("wifi_campaign_events")
    .insert({
      campaign_id: campaign.id,
      user_id: campaign.user_id,
      event_type: "click",
      portal_token: portalToken,
      user_agent: userAgent,
      ip_address: ipAddress,
    })
    .then(() => undefined)
    .catch(() => undefined);

  return NextResponse.redirect(new URL(redirectUrl, req.url));
}
