import { NextRequest, NextResponse } from "next/server";

// Simple XML parser for server-side RSS parsing
function parseXML(xmlString: string, feedUrl: string) {
  const items: any[] = [];
  
  // Find all items (RSS) - handle multiline content
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let itemMatch;
  
  while ((itemMatch = itemRegex.exec(xmlString)) !== null) {
    const itemContent = itemMatch[1];
    
    // Use [\s\S]*? for multiline matching (matches newlines too)
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/.exec(itemContent);
    const descMatch = /<description[^>]*>([\s\S]*?)<\/description>/.exec(itemContent);
    const linkMatch = /<link[^>]*>([\s\S]*?)<\/link>/.exec(itemContent);
    const pubDateMatch = /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/.exec(itemContent);
    
    // Try to find image from various sources
    let imageUrl = "";
    const mediaMatch = /<media:content[^>]*url="([^"]*)"/.exec(itemContent);
    const mediaThumbMatch = /<media:thumbnail[^>]*url="([^"]*)"/.exec(itemContent);
    const mediaUrlMatch = /<media:url[^>]*>([\s\S]*?)<\/media:url>/.exec(itemContent);
    const enclosureMatch = /<enclosure[^>]*url="([^"]*)"/.exec(itemContent);
    if (mediaMatch) {
      imageUrl = mediaMatch[1];
    } else if (mediaThumbMatch) {
      imageUrl = mediaThumbMatch[1];
    } else if (mediaUrlMatch) {
      imageUrl = mediaUrlMatch[1].trim();
    } else if (enclosureMatch) {
      imageUrl = enclosureMatch[1];
    }

    // Try to extract image from description HTML if missing
    if (!imageUrl && descMatch?.[1]) {
      const imgMatch = /<img[^>]*src=["']([^"']+)["']/i.exec(descMatch[1]);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }

    // Normalize relative URLs (e.g., "/path/img.jpg" or "//cdn")
    const normalizeImageUrl = (raw: string | undefined, pageLink: string, feedUrl: string) => {
      if (!raw) return "";
      const trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith("data:")) return "";
      if (trimmed.startsWith("//")) {
        return "https:" + trimmed;
      }
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
      }
      // relative path: use article link origin, fallback to feed origin
      try {
        const origin = new URL(pageLink || feedUrl).origin;
        return new URL(trimmed, origin).toString();
      } catch {
        return trimmed;
      }
    };

    imageUrl = normalizeImageUrl(imageUrl, linkMatch ? linkMatch[1].trim() : feedUrl, feedUrl);

    const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').replace(/&[a-zA-Z]+;/g, '').trim() : "";
    const description = descMatch ? descMatch[1].replace(/<[^>]*>/g, '').replace(/&[a-zA-Z]+;/g, '').trim() : "";
      const link = linkMatch ? linkMatch[1].trim() : "";
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();

    if (title) {
      console.log("[v0] Found item:", { title: title.substring(0, 50), hasDesc: !!description });
      items.push({
        title,
        description,
        link,
        pubDate,
        image: imageUrl || "",
      });
    }
  }

  console.log("[v0] Total items found:", items.length);

  // If no RSS items found, try Atom
  if (items.length === 0) {
    console.log("[v0] No RSS items, trying Atom...");
    const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g;
    let entryMatch;
    
    while ((entryMatch = entryRegex.exec(xmlString)) !== null) {
      const entryContent = entryMatch[1];
      
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/.exec(entryContent);
      const summaryMatch = /<summary[^>]*>([\s\S]*?)<\/summary>/.exec(entryContent);
      const linkMatch = /<link[^>]*href="([^"]*)"/.exec(entryContent);
      const publishedMatch = /<published[^>]*>([\s\S]*?)<\/published>/.exec(entryContent);

      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').replace(/&[a-zA-Z]+;/g, '').trim() : "";
      const description = summaryMatch ? summaryMatch[1].replace(/<[^>]*>/g, '').replace(/&[a-zA-Z]+;/g, '').trim() : "";
      const link = linkMatch ? linkMatch[1].trim() : "";
      const pubDate = publishedMatch ? publishedMatch[1].trim() : new Date().toISOString();

      if (title) {
        items.push({
          title,
          description,
          link,
          pubDate,
          image: "",
        });
      }
    }
  }

  return items;
}

export async function POST(request: NextRequest) {
  try {
    const { url: rawUrl } = await request.json();

    // Normalize common mistaken paths (ex.: duplicated "ultimas-noticias")
    const url = rawUrl?.replace(/ultimas-noticias\/ultimas-noticias/gi, "ultimas-noticias");

    if (!url) {
      return NextResponse.json({ error: "URL é obrigatória" }, { status: 400 });
    }

    console.log("[v0] Fetching RSS from:", url);

    // Use a more aggressive approach with browser-like headers
    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, */*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Microsoft Edge";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive',
      'Referer': 'https://www.google.com/',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    // Função que tenta buscar direto e, se necessário, via proxy
    const tryFetch = async (targetUrl: string) => {
      return fetch(targetUrl, {
        method: 'GET',
        headers: browserHeaders,
        redirect: 'follow',
        signal: controller.signal,
      });
    };

    const tryProxy = async () => {
      return fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      });
    };

    let response;
    try {
      response = await tryFetch(url);
      if (!response.ok) {
        console.warn("[v0] Direct fetch failed with", response.status, "retrying via proxy...");
        response = await tryProxy();
      }
    } catch (fetchError) {
      console.warn("[v0] Direct fetch error, trying proxy:", fetchError);
      response = await tryProxy();
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[v0] HTTP error mesmo após proxy:", response.status, response.statusText);
      return NextResponse.json({ 
        items: [],
        warning: `HTTP ${response.status}: servidor bloqueou ou retornou erro.`
      }, { status: 200 });
    }

    const content = await response.text();
    console.log("[v0] Content received:", content.length, "bytes");

    if (!content || content.length === 0) {
      return NextResponse.json({ 
        error: "Feed vazio ou inválido" 
      }, { status: 400 });
    }

    const items = parseXML(content, url);
    console.log("[v0] Parsed items:", items.length);

    if (items.length === 0) {
      return NextResponse.json({ 
        error: "Nenhuma notícia encontrada no feed. O formato pode ser incompatível." 
      }, { status: 400 });
    }

    return NextResponse.json({ items });

  } catch (error) {
    console.error("[v0] RSS fetch error:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      items: [],
      warning: "Erro ao buscar o feed; retornando lista vazia."
    }, { status: 200 });
  }
}
