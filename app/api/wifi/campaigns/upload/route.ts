import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";

const BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "midias";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "bin";
    const path = `${user.id}/campaigns/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    console.error("[wifi/campaigns/upload]", error);
    return NextResponse.json(
      { error: "Falha no upload da campanha" },
      { status: 500 },
    );
  }
}
