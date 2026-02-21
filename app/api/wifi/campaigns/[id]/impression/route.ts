import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
  "base64",
);

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
    .select(
      "id,user_id,status,start_at,end_at,max_impressions_per_session",
    )
    .eq("id", id)
    .maybeSingle();

  if (!campaign || !isCampaignLive(campaign)) {
    return new NextResponse(PIXEL_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  }

  const portalToken = req.nextUrl.searchParams.get("portal_token");
  const userAgent = req.headers.get("user-agent");
  const ipAddress = getClientIp(req);
  const sessionCookieName = `wifi_cmp_${campaign.id}`;
  const currentImpressions = Number(req.cookies.get(sessionCookieName)?.value || 0);
  const cap = Number(campaign.max_impressions_per_session || 0);
  const shouldCount = !(cap > 0 && currentImpressions >= cap);

  if (shouldCount) {
    await supabase
      .from("wifi_campaign_events")
      .insert({
        campaign_id: campaign.id,
        user_id: campaign.user_id,
        event_type: "impression",
        portal_token: portalToken,
        user_agent: userAgent,
        ip_address: ipAddress,
      })
      .then(() => undefined)
      .catch(() => undefined);
  }

  const response = new NextResponse(PIXEL_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });

  response.cookies.set(sessionCookieName, String(currentImpressions + 1), {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    secure: true,
    httpOnly: true,
  });

  return response;
}
