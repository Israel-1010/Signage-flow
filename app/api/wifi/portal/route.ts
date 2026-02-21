import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("wifi_portals")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    console.error("wifi portal get", error);
    return NextResponse.json({ error: "Failed to load portal" }, { status: 500 });
  }

  return NextResponse.json(
    data || {
      name: "Meu Portal",
      status: "draft",
      theme: "modern",
      html: "",
      css: "",
    }
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Get current token or create a new one
  const { data: existing } = await supabase
    .from("wifi_portals")
    .select("token")
    .eq("user_id", user.id)
    .maybeSingle();

  const token = existing?.token || body.token || randomUUID().replace(/-/g, "").slice(0, 24);

  const payload = {
    user_id: user.id,
    name: body.name?.slice(0, 120) || "Meu Portal",
    logo_url: body.logo_url || null,
    background_url: body.background_url || null,
    banner_url: body.banner_url || null,
    html: body.html || "",
    css: body.css || "",
    theme: body.theme === "classic" ? "classic" : "modern",
    auth_options: body.auth_options || {},
    status: body.status === "published" ? "published" : "draft",
    token,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("wifi_portals").upsert(payload, {
    onConflict: "user_id",
  });

  if (error && /theme/i.test(error.message || "")) {
    const { theme, ...payloadWithoutTheme } = payload;
    const retry = await supabase.from("wifi_portals").upsert(payloadWithoutTheme, {
      onConflict: "user_id",
    });

    if (retry.error) {
      console.error("wifi portal save", retry.error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: payload.status,
      token,
      warning: "Coluna 'theme' não encontrada no banco. Execute a query de migração para habilitar temas.",
    });
  }

  if (error) {
    console.error("wifi portal save", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: payload.status, token });
}



