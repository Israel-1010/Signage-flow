import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Popular RSS feeds pre-configured - only URLs verificadas recentemente
export const POPULAR_FEEDS = [
  // Governo Federal (RSS oficial)
  { name: "gov.br - Últimas Notícias", url: "https://www.gov.br/pt-br/noticias/ultimas-noticias/RSS", category: "news" },
  { name: "gov.br - Saúde", url: "https://www.gov.br/pt-br/noticias/saude-e-vigilancia-sanitaria/RSS", category: "news" },

  // BBC (feed estável e público)
  { name: "BBC News - Front Page", url: "http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/front_page/rss.xml", category: "news" },
  { name: "BBC News - Business", url: "http://newsrss.bbc.co.uk/rss/newsonline_uk_edition/business/rss.xml", category: "news" },

  // Hacker News (texto leve, confiável)
  { name: "Hacker News - Top", url: "https://news.ycombinator.com/rss", category: "tech" },
];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's saved feeds
    const { data: feeds, error } = await supabase
      .from("rss_feeds")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feeds, popular: POPULAR_FEEDS });
  } catch (error) {
    console.error("Get feeds error:", error);
    return NextResponse.json({ error: "Failed to get feeds" }, { status: 500 });
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

    const { name, url, category } = await request.json();

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
    }

    const { data: feed, error } = await supabase
      .from("rss_feeds")
      .insert({
        user_id: user.id,
        name,
        url,
        category,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ feed });
  } catch (error) {
    console.error("Create feed error:", error);
    return NextResponse.json({ error: "Failed to create feed" }, { status: 500 });
  }
}
