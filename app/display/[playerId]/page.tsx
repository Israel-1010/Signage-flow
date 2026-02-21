"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import useSWR from "swr";
import { Monitor, Loader2 } from "lucide-react";
import { RSSDisplay } from "@/components/display/rss-display";

interface Asset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

interface PlaylistItem {
  id: string;
  position: number;
  duration: number;
  asset: Asset | null;
  rss_feed_url: string | null;
  rss_display_type: "ticker" | "card" | "fullscreen" | null;
  rss_update_interval: number | null;
}

interface Playlist {
  id: string;
  name: string;
  playlist_items: PlaylistItem[];
}

interface DisplayData {
  player: {
    id: string;
    name: string;
    rss_enabled?: boolean;
    rss_feed_url?: string | null;
    rss_display_type?: "ticker" | "card" | "fullscreen" | null;
    rss_update_interval?: number | null;
    rss_slot_duration?: number | null;
    rss_slot_every?: number | null;
  };
  playlist: Playlist | null;
}

interface ErrorResponse {
  error: string;
  code?: string;
}

// Generate or retrieve device token
function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  
  let token = localStorage.getItem("signageflow_device_token");
  if (!token) {
    token = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("signageflow_device_token", token);
  }
  return token;
}

const createFetcher = (deviceToken: string) => async (url: string) => {
  const response = await fetch(url, {
    headers: {
      "x-device-token": deviceToken,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json() as ErrorResponse;
    const error = new Error(errorData.error || "Failed to fetch display data") as Error & { code?: string };
    error.code = errorData.code;
    throw error;
  }
  
  return response.json() as Promise<DisplayData>;
};

export default function DisplayPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = use(params);
  const [deviceToken, setDeviceToken] = useState<string>("");
  
  useEffect(() => {
    setDeviceToken(getDeviceToken());
  }, []);

  const { data, error, isLoading } = useSWR(
    deviceToken ? `/api/display/${playerId}` : null,
    deviceToken ? createFetcher(deviceToken) : null,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const playlistItems = (data?.playlist?.playlist_items || []).filter((item) => item.asset); // ignora RSS em playlist

  const rssConfig = data?.player?.rss_enabled && data?.player?.rss_feed_url
    ? {
        feedUrl: data.player.rss_feed_url,
        displayType: data.player.rss_display_type || "card",
        updateInterval: data.player.rss_update_interval || 300,
        slotDuration: data.player.rss_slot_duration || 10,
        slotEvery: data.player.rss_slot_every || 2,
      }
    : null;

  const items = useMemo(() => {
    if (!rssConfig) return playlistItems;
    const result: PlaylistItem[] = [];
    const every = Math.max(1, rssConfig.slotEvery);
    playlistItems.forEach((item, idx) => {
      result.push(item);
      if ((idx + 1) % every === 0) {
        result.push({
          id: `rss-${idx}`,
          position: idx + 0.5,
          duration: rssConfig.slotDuration,
          asset: null,
          rss_feed_url: rssConfig.feedUrl,
          rss_display_type: rssConfig.displayType as any,
          rss_update_interval: rssConfig.updateInterval,
        });
      }
    });
    if (result.length === playlistItems.length) {
      // se poucos itens, garante pelo menos um slot RSS
      result.push({
        id: `rss-tail`,
        position: result.length + 0.5,
        duration: rssConfig.slotDuration,
        asset: null,
        rss_feed_url: rssConfig.feedUrl,
        rss_display_type: rssConfig.displayType as any,
        rss_update_interval: rssConfig.updateInterval,
      });
    }
    return result;
  }, [playlistItems, rssConfig]);

  const currentItem = items[currentIndex];

  const logPlayback = useCallback(
    async (status: "started" | "ended" = "started") => {
      if (!currentItem || !data?.player?.id) return;
      try {
        await fetch("/api/playback/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId: data.player.id,
            playlistId: data.playlist?.id ?? null,
            itemId: currentItem.id,
            itemType: currentItem.asset ? currentItem.asset.type : "rss",
            title: currentItem.asset?.name ?? "RSS",
            startedAt: new Date().toISOString(),
            duration: currentItem.duration,
            status,
            details: {
              url: currentItem.asset?.url ?? (currentItem as any).rss_feed_url ?? null,
            },
          }),
        });
      } catch (err) {
        console.error("[reporting] log failed", err);
      }
    },
    [currentItem, data?.player?.id, data?.playlist?.id]
  );

  const goToNext = useCallback(() => {
    if (items.length === 0) return;
    logPlayback("ended");
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsVideoPlaying(false);
  }, [items.length, logPlayback]);

  // Handle automatic advancement for images and RSS
  useEffect(() => {
    if (!currentItem || items.length === 0) return;

    // For images and RSS, advance after the specified duration
    if ((currentItem.asset && currentItem.asset.type === "image") || currentItem.rss_feed_url) {
      const timer = setTimeout(() => {
        goToNext();
      }, currentItem.duration * 1000);

      return () => clearTimeout(timer);
    }
  }, [currentItem, currentIndex, goToNext, items.length]);

  // Handle video end
  const handleVideoEnd = () => {
    goToNext();
  };

  // log when item changes
  useEffect(() => {
    if (currentItem) logPlayback("started");
  }, [currentItem, logPlayback]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-white" />
      </div>
    );
  }

  if (error) {
    const isDeviceLocked = (error as Error & { code?: string }).code === "DEVICE_LOCKED";
    
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-white">
        <Monitor className={`h-16 w-16 ${isDeviceLocked ? "text-yellow-500" : "text-red-500"}`} />
        <h1 className="mt-4 text-2xl font-semibold">
          {isDeviceLocked ? "Dispositivo Bloqueado" : "Display Not Found"}
        </h1>
        <p className="mt-2 max-w-md text-center text-gray-400">
          {isDeviceLocked 
            ? "Este player já está em uso em outro dispositivo. Desbloqueie-o no painel de controle para usar neste dispositivo."
            : "This player does not exist or has been removed."}
        </p>
        {isDeviceLocked && (
          <p className="mt-4 text-sm text-gray-500">
            Acesse o painel e clique em &quot;Desbloquear Dispositivo&quot; na página de Players.
          </p>
        )}
      </div>
    );
  }

  if (!data?.playlist || items.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-black text-white">
        <Monitor className="h-16 w-16 text-blue-500" />
        <h1 className="mt-4 text-2xl font-semibold">{data?.player?.name || "Display"}</h1>
        <p className="mt-2 text-gray-400">No content assigned to this display.</p>
        <p className="mt-1 text-sm text-gray-500">Assign a playlist to start showing content.</p>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {currentItem && (
        <>
          {currentItem.rss_feed_url ? (
            <RSSDisplay 
              key={currentItem.id}
              feedUrl={currentItem.rss_feed_url}
              displayType={currentItem.rss_display_type || "card"}
              updateInterval={currentItem.rss_update_interval || 300}
            />
          ) : currentItem.asset?.type === "image" ? (
            <img
              key={currentItem.id}
              src={currentItem.asset.url || "/placeholder.svg"}
              alt={currentItem.asset.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <video
              key={currentItem.id}
              src={currentItem.asset?.url}
              className="h-full w-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnd}
              onPlay={() => setIsVideoPlaying(true)}
            />
          )}
        </>
      )}

      {/* Progress indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex ? "bg-white" : "bg-white/30"
              }`}
            />
          ))}
        </div>
      )}

      {/* Debug info (hidden in production) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute right-4 top-4 rounded bg-black/70 p-2 text-xs text-white">
          <p>Player: {data.player.name}</p>
          <p>Playlist: {data.playlist.name}</p>
          <p>Item: {currentIndex + 1}/{items.length}</p>
          {currentItem && (
            <p>Duration: {currentItem.duration}s</p>
          )}
        </div>
      )}
    </div>
  );
}
