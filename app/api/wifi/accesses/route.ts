import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AccessFilters = {
  search: string;
  provider: string;
  status: string;
  dateFrom: string;
  dateTo: string;
};

function parseFilters(searchParams: URLSearchParams): AccessFilters {
  return {
    search: searchParams.get("search")?.trim() || "",
    provider: searchParams.get("provider") || "all",
    status: searchParams.get("status") || "all",
    dateFrom: searchParams.get("date_from") || "",
    dateTo: searchParams.get("date_to") || "",
  };
}

function applyFilters(query: any, filters: AccessFilters) {
  const safeSearch = filters.search.replace(/,/g, " ").replace(/%/g, "");

  if (safeSearch) {
    query = query.or(
      `visitor_name.ilike.%${safeSearch}%,visitor_email.ilike.%${safeSearch}%,ip_address.ilike.%${safeSearch}%`,
    );
  }

  if (filters.provider !== "all") {
    query = query.eq("auth_provider", filters.provider);
  }

  if (filters.status === "online") {
    query = query.is("disconnected_at", null);
  }

  if (filters.status === "offline") {
    query = query.not("disconnected_at", "is", null);
  }

  if (filters.dateFrom) {
    query = query.gte("connected_at", `${filters.dateFrom}T00:00:00`);
  }

  if (filters.dateTo) {
    query = query.lte("connected_at", `${filters.dateTo}T23:59:59`);
  }

  return query;
}

function missingTable(errorMessage?: string) {
  const msg = (errorMessage || "").toLowerCase();
  return msg.includes("wifi_accesses") && msg.includes("does not exist");
}

function normalizeProvider(provider?: string) {
  const value = (provider || "").toLowerCase().trim();
  if (!value) return "unknown";

  const allowed = [
    "cpf",
    "email",
    "google",
    "facebook",
    "linkedin",
    "tiktok",
    "x",
    "userpass",
    "sms",
    "voucher",
    "unknown",
  ];

  return allowed.includes(value) ? value : "unknown";
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

    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const pageSize = Math.min(
      Math.max(Number(searchParams.get("page_size") || 20), 1),
      100,
    );
    const filters = parseFilters(searchParams);

    let pageQuery = supabase
      .from("wifi_accesses")
      .select(
        "id,visitor_name,visitor_email,ip_address,auth_provider,connected_at,disconnected_at,connected_seconds,device_type,os_name,created_at",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("connected_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    pageQuery = applyFilters(pageQuery, filters);

    const { data, error, count } = await pageQuery;

    if (error) {
      if (missingTable(error.message)) {
        return NextResponse.json({
          items: [],
          summary: {
            total: 0,
            online: 0,
            avgConnectedSeconds: 0,
            byProvider: {},
          },
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 1,
          },
          warning:
            "Table wifi_accesses not found. Run the SQL migration before using this screen.",
        });
      }

      throw new Error(error.message);
    }

    let summaryQuery = supabase
      .from("wifi_accesses")
      .select("auth_provider,connected_seconds,disconnected_at")
      .eq("user_id", user.id)
      .limit(5000);

    summaryQuery = applyFilters(summaryQuery, filters);
    const { data: summaryRows } = await summaryQuery;

    const byProvider =
      summaryRows?.reduce<Record<string, number>>((acc, row) => {
        const key = row.auth_provider || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}) || {};

    const totalDuration =
      summaryRows?.reduce((acc, row) => acc + (row.connected_seconds || 0), 0) ||
      0;

    const online =
      summaryRows?.reduce((acc, row) => acc + (row.disconnected_at ? 0 : 1), 0) ||
      0;

    const totalRows = summaryRows?.length || 0;
    const avgConnectedSeconds =
      totalRows > 0 ? Math.round(totalDuration / totalRows) : 0;

    return NextResponse.json({
      items: data || [],
      summary: {
        total: count || 0,
        online,
        avgConnectedSeconds,
        byProvider,
      },
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(Math.ceil((count || 0) / pageSize), 1),
      },
    });
  } catch (error) {
    console.error("[wifi/accesses] get error", error);
    return NextResponse.json(
      { error: "Failed to load access data" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await req.json();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectedAt = body.connected_at
      ? new Date(body.connected_at)
      : new Date();
    const disconnectedAt = body.disconnected_at
      ? new Date(body.disconnected_at)
      : null;

    const inferredSeconds =
      disconnectedAt && !Number.isNaN(connectedAt.getTime())
        ? Math.max(
            Math.floor(
              (disconnectedAt.getTime() - connectedAt.getTime()) / 1000,
            ),
            0,
          )
        : null;

    const payload = {
      user_id: user.id,
      visitor_name: body.visitor_name?.toString().slice(0, 160) || "Visitante",
      visitor_email: body.visitor_email?.toString().slice(0, 160) || null,
      ip_address: body.ip_address?.toString().slice(0, 64) || null,
      auth_provider: normalizeProvider(body.auth_provider),
      connected_at: connectedAt.toISOString(),
      disconnected_at: disconnectedAt ? disconnectedAt.toISOString() : null,
      connected_seconds:
        typeof body.connected_seconds === "number"
          ? Math.max(Math.floor(body.connected_seconds), 0)
          : inferredSeconds,
      device_type: body.device_type?.toString().slice(0, 80) || null,
      os_name: body.os_name?.toString().slice(0, 80) || null,
      metadata:
        body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    };

    const { data, error } = await supabase
      .from("wifi_accesses")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("[wifi/accesses] create error", error);
    return NextResponse.json(
      { error: "Failed to register access" },
      { status: 500 },
    );
  }
}
