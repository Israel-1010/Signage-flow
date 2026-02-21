import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "midias";
const FALLBACK_BUCKET = "public";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine file type
    const mimeType = file.type || "application/octet-stream";
    let fileType: "image" | "video" = "image";
    if (mimeType.startsWith("video/")) fileType = "video";

    const uploadToBucket = async (bucket: string) => {
      const storagePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          upsert: false,
          contentType: mimeType,
        });
      if (error) throw error;
      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      return publicData?.publicUrl;
    };

    let publicUrl: string | undefined;
    try {
      publicUrl = await uploadToBucket(PRIMARY_BUCKET);
    } catch (err: any) {
      if (String(err.message || "").toLowerCase().includes("bucket not found")) {
        publicUrl = await uploadToBucket(FALLBACK_BUCKET);
      } else {
        throw err;
      }
    }

    // Salvar metadados em assets table
    const { data: asset, error } = await supabase
      .from("assets")
      .insert({
        user_id: user.id,
        name: name || file.name,
        url: publicUrl,
        type: fileType,
        file_size: file.size,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: `Failed to save asset: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("[v0] Upload error:", error);
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
