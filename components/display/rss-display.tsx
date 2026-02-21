"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudLightning,
  CloudFog,
  Snowflake,
} from "lucide-react";

interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  image?: string;
}

interface RSSDisplayProps {
  feedUrl: string;
  displayType: "ticker" | "card" | "fullscreen";
  updateInterval?: number;
}

type WeatherSlice = {
  date: string;
  tmax: number;
  tmin: number;
  code: number;
};

type WeatherData = {
  currentTemp: number;
  currentCode: number;
  daily: WeatherSlice[];
  location: string;
};

export function RSSDisplay({ feedUrl, displayType, updateInterval = 300 }: RSSDisplayProps) {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        console.log("[v0] Fetching RSS feed:", feedUrl);
        const response = await fetch("/api/rss/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: feedUrl }),
        });
        
        console.log("[v0] RSS fetch response status:", response.status);
        
        const data = await response.json();
        const parsed = (data.items || []).map((item: RSSItem) => ({
          ...item,
          pubDate: item.pubDate || new Date().toISOString(),
        }));
        parsed.sort((a: RSSItem, b: RSSItem) => {
          const da = Date.parse(a.pubDate) || 0;
          const db = Date.parse(b.pubDate) || 0;
          return db - da;
        });
        setItems(parsed);
        if (!parsed.length && data.warning) {
          console.warn("[v0] RSS warning:", data.warning);
        }
      } catch (error) {
        console.error("[v0] Erro ao buscar RSS:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
    const interval = setInterval(fetchFeed, updateInterval * 1000);

    return () => clearInterval(interval);
  }, [feedUrl, updateInterval]);

  // Rotação automática apenas no ticker
  useEffect(() => {
    if (displayType !== "ticker" || items.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [items.length, displayType]);

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Weather fetch (São Paulo default)
  useEffect(() => {
    const loadWeather = async () => {
      try {
        setWeatherLoading(true);
        const lat = -23.55;
        const lon = -46.64;
        const tz = "auto";
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=${tz}&forecast_days=7`;
        const res = await fetch(url);
        const data = await res.json();
        const daily: WeatherSlice[] =
          data.daily?.time?.map((d: string, idx: number) => ({
            date: d,
            tmax: Math.round(data.daily.temperature_2m_max[idx]),
            tmin: Math.round(data.daily.temperature_2m_min[idx]),
            code: data.daily.weathercode[idx],
          })) || [];
        setWeather({
          currentTemp: Math.round(data.current_weather?.temperature ?? 0),
          currentCode: data.current_weather?.weathercode ?? 0,
          daily,
          location: "São Paulo",
        });
      } catch (err) {
        console.error("[v0] Weather error", err);
        setWeather(null);
      } finally {
        setWeatherLoading(false);
      }
    };
    loadWeather();
  }, []);

  const weatherIcon = useMemo(() => {
    const code = weather?.currentCode ?? -1;
    if (code === -1) return Cloud;
    if ([0].includes(code)) return Sun;
    if ([1, 2].includes(code)) return CloudSun;
    if ([3, 45, 48].includes(code)) return CloudFog;
    if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return CloudRain;
    if ([95, 96, 99].includes(code)) return CloudLightning;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return Snowflake;
    return Cloud;
  }, [weather]);

  const iconByCode = (code: number) => {
    if ([0].includes(code)) return Sun;
    if ([1, 2].includes(code)) return CloudSun;
    if ([3, 45, 48].includes(code)) return CloudFog;
    if ([51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(code)) return CloudRain;
    if ([95, 96, 99].includes(code)) return CloudLightning;
    if ([71, 73, 75, 77, 85, 86].includes(code)) return Snowflake;
    return Cloud;
  };

  const weatherTheme = useMemo(() => {
    const code = weather?.currentCode ?? -1;
    const isRain = [51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
    const isCloud = [1, 2, 3, 45, 48].includes(code);
    const isSnow = [71, 73, 75, 77, 85, 86].includes(code);

    const rainPattern = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'>
         <g fill='%230ea5e9' fill-opacity='0.18'>
           <path d='M40 20c-2 8-10 12-10 20s12 10 18 4 6-16-2-24h-6z'/>
           <path d='M120 60c-2 8-10 12-10 20s12 10 18 4 6-16-2-24h-6z'/>
           <path d='M70 110c-2 8-10 12-10 20s12 10 18 4 6-16-2-24h-6z'/>
         </g>
       </svg>`
    );

    const cloudPattern = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='120' viewBox='0 0 200 120'>
         <g fill='%2394a3b8' fill-opacity='0.10'>
           <ellipse cx='40' cy='60' rx='38' ry='18'/>
           <ellipse cx='110' cy='50' rx='42' ry='20'/>
           <ellipse cx='170' cy='70' rx='36' ry='17'/>
         </g>
       </svg>`
    );

    const sunPattern = encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'>
         <defs>
           <radialGradient id='g' cx='0.5' cy='0.5' r='0.5'>
             <stop offset='0%' stop-color='%23fde68a' stop-opacity='0.25'/>
             <stop offset='100%' stop-color='%23f59e0b' stop-opacity='0'/>
           </radialGradient>
         </defs>
         <circle cx='110' cy='110' r='110' fill='url(#g)'/>
       </svg>`
    );

    if (isRain) {
      return {
        bgImage: `url("data:image/svg+xml,${rainPattern}"), linear-gradient(180deg, #e0f2fe 0%, #93c5fd 55%, #60a5fa 100%)`,
        bgSize: "220px 220px, cover",
        text: "text-slate-900",
        cardBg: "bg-white/80",
        icon: "#0ea5e9",
      };
    }
    if (isCloud || isSnow) {
      return {
        bgImage: `url("data:image/svg+xml,${cloudPattern}"), linear-gradient(180deg, #f8fafc 0%, #e2e8f0 60%, #cbd5e1 100%)`,
        bgSize: "180px 110px, cover",
        text: "text-slate-900",
        cardBg: "bg-white/80",
        icon: "#475569",
      };
    }
    // sunny / default
    return {
      bgImage: `url("data:image/svg+xml,${sunPattern}"), linear-gradient(180deg, #fff7d6 0%, #fde68a 55%, #fbbf24 100%)`,
      bgSize: "240px 240px, cover",
      text: "text-amber-900",
      cardBg: "bg-white/85",
      icon: "#d97706",
    };
  }, [weather]);

  const formatHour = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const formatWeekday = now.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" });
  const dailyList = weather?.daily || [];
  const scaleMin = dailyList.length ? Math.min(...dailyList.map((v) => v.tmin ?? 0)) : 0;
  const scaleMax = dailyList.length ? Math.max(...dailyList.map((v) => v.tmax ?? 0)) : 0;
  const scaleRange = Math.max(1, scaleMax - scaleMin);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">Carregando notícias...</p>
          <p className="text-xs text-muted-foreground">Feed: {feedUrl}</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-2">Nenhuma notícia disponível</p>
          <p className="text-xs text-muted-foreground">Feed: {feedUrl}</p>
        </div>
      </div>
    );
  }

  if (displayType === "ticker") {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-red-600 text-white py-4 overflow-hidden z-50 shadow-lg">
        <div className="flex items-center gap-4 px-4">
          <div className="flex-shrink-0 font-bold text-xl uppercase tracking-wide">NOTÍCIAS</div>
          <div className="flex-1 overflow-hidden">
            <div className="inline-block whitespace-nowrap animate-scroll text-lg font-medium">
              {items.map((item, index) => (
                <span key={index} className="inline-block px-8">
                  • {item.title}
                </span>
              ))}
            </div>
          </div>
        </div>
        <style jsx>{`
          @keyframes scroll {
            0% {
              transform: translateX(100%);
            }
            100% {
              transform: translateX(-100%);
            }
          }
          .animate-scroll {
            animation: scroll 60s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  if (displayType === "card") {
    const currentItem = items[0]; // sempre a mais recente
    const cleanTitle = currentItem.title?.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]*>/g, "").trim();
    const cleanDesc = currentItem.description
      ?.replace(/<!\[CDATA\[|\]\]>/g, "")
      .replace(/<[^>]*>/g, "")
      .trim();
    const shortDesc =
      cleanDesc && cleanDesc.length > 220 ? `${cleanDesc.slice(0, 220)}…` : cleanDesc || "Sem descrição disponível para esta matéria.";
    // layout inspirado no mock: hero + faixa com título/desc e sidebar de clima
    return (
      <div className="flex h-full w-full bg-gradient-to-b from-[#eef1f4] to-[#e6e9ee] text-foreground px-3 py-3 sm:px-6 sm:py-5">
        <div className="w-full flex flex-col gap-3">
          <div className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-slate-900">Últimas Notícias</div>

          {currentItem ? (
            <div className="grid h-full min-h-[70vh] w-full grid-cols-1 gap-3 xl:grid-cols-[3fr_1fr]">
              {/* Hero */}
              <div className="flex flex-col overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl ring-1 ring-slate-200">
                {currentItem.image ? (
                  <img
                    src={currentItem.image}
                    alt={cleanTitle}
                    className="w-full max-h-[62vh] object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-48 sm:h-64 lg:h-72 w-full items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-white">
                    <div className="text-center">
                      <div className="mb-3 text-5xl">📰</div>
                      <p className="text-sm text-muted-foreground">Sem imagem disponível</p>
                    </div>
                  </div>
                )}

                {/* Faixa inferior fora da imagem */}
                <div className="px-4 py-3 sm:px-6 sm:py-4 text-slate-900 border-t border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">Notícia</div>
                  <div className="mt-1 text-lg sm:text-xl font-bold italic leading-snug line-clamp-2">{cleanTitle}</div>
                  <div className="mt-1 text-sm italic text-slate-700 line-clamp-2">
                    {shortDesc}
                  </div>
                </div>
              </div>

              {/* Sidebar clima + hora */}
              <div
                className={`relative flex h-full flex-col overflow-hidden rounded-2xl shadow-2xl p-5 gap-6 ring-1 ring-black/5 ${weatherTheme.text}`}
                style={{
                  backgroundImage: weatherTheme.bgImage,
                  backgroundSize: weatherTheme.bgSize ?? "cover",
                  backgroundPosition: "top right, center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div className="absolute inset-0 bg-white/14 backdrop-blur-[1px]" aria-hidden />

                <div className="relative space-y-4">
                  <div className="text-sm font-semibold uppercase tracking-wide opacity-80">Hoje</div>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const Icon = weatherIcon;
                      return <Icon className="h-14 w-14 drop-shadow-sm" style={{ color: weatherTheme.icon }} />;
                    })()}
                    <div>
                      <div className="text-5xl font-bold leading-tight drop-shadow-sm">
                        {weatherLoading ? "--" : `${weather?.currentTemp ?? "--"}°`}
                      </div>
                      <div className="text-xs capitalize opacity-90">{formatWeekday}</div>
                      <div className="text-[11px] opacity-80 mt-1">Local: {weather?.location || "São Paulo"}</div>
                    </div>
                  </div>
                </div>

                <div className="relative space-y-2 text-sm">
                  {(weather?.daily || [])
                    .slice(0, 7)
                    .map((d) => {
                      const Icon = iconByCode(d.code);
                      const dayLabel = new Date(d.date).toLocaleDateString("pt-BR", { weekday: "long" });
                      const min = d.tmin ?? 0;
                      const max = d.tmax ?? 0;
                      const fillStart = ((min - scaleMin) / Math.max(1, scaleRange)) * 100;
                      const fillEnd = ((max - scaleMin) / Math.max(1, scaleRange)) * 100;
                      const gradient = `linear-gradient(90deg, rgba(59,130,246,0.35) ${fillStart}%, rgba(244,114,182,0.55) ${fillEnd}%, rgba(255,255,255,0.35) ${fillEnd}%)`;
                      return (
                        <div key={d.date} className={`rounded-xl px-3 py-2 ${weatherTheme.cardBg} shadow-sm ring-1 ring-black/5`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: weatherTheme.icon }} />
                              <span className="font-semibold capitalize">{dayLabel}</span>
                            </div>
                            <span className="text-sm font-medium">{min}° / {max}°</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/40 ring-1 ring-black/5" style={{ background: gradient }} />
                        </div>
                      );
                    })}
                </div>

                <div className="relative text-right text-4xl font-bold tracking-tight drop-shadow-sm">
                  {formatHour}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-border text-muted-foreground">
              Nenhuma notícia disponível.
            </div>
          )}
        </div>
      </div>
    );
  }

  // fullscreen
  const currentItem = items[currentIndex];
  return (
    <div className="relative flex h-full w-full flex-col bg-gradient-to-b from-[#eef1f4] to-[#e6e9ee]">
      {/* Header com título da notícia */}
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        {currentItem.image && (
          <div className="mb-8 h-80 w-full max-w-2xl rounded-lg overflow-hidden shadow-xl ring-1 ring-black/5">
            <img 
              src={currentItem.image || "/placeholder.svg"} 
              alt={currentItem.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
        <div className="max-w-4xl text-center space-y-4">
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight text-slate-900">{currentItem.title}</h1>
          <p className="text-xl sm:text-2xl leading-relaxed text-slate-700">{currentItem.description}</p>
          <p className="text-sm text-slate-500">
            {new Date(currentItem.pubDate).toLocaleString("pt-BR")}
          </p>
        </div>
      </div>

      {/* Footer com indicadores */}
      <div className="flex-shrink-0 bg-primary text-primary-foreground px-12 py-6 flex items-center justify-between">
        <div className="text-lg font-semibold">NOTÍCIA {currentIndex + 1} DE {items.length}</div>
        <div className="flex gap-2">
          {items.map((_, index) => (
            <div
              key={index}
              className={`h-3 rounded-full transition-all ${index === currentIndex ? "bg-white w-12" : "bg-white/40 w-3"}`}
            />
          ))}
        </div>
      </div>

      {/* Weather overlay para fullscreen */}
      {weather && (
        <div
          className={`absolute top-6 right-6 w-72 rounded-2xl shadow-2xl ring-1 ring-black/10 overflow-hidden ${weatherTheme.text}`}
          style={{
            backgroundImage: weatherTheme.bgImage,
            backgroundSize: weatherTheme.bgSize ?? "cover",
            backgroundPosition: "top right, center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="absolute inset-0 bg-white/16 backdrop-blur-[1px]" aria-hidden />
          <div className="relative p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm uppercase font-semibold opacity-80">Agora</div>
                <div className="text-4xl font-bold leading-tight">
                  {weatherLoading ? "--" : `${weather?.currentTemp ?? "--"}°`}
                </div>
                <div className="text-xs opacity-80">{formatWeekday}</div>
                <div className="text-[11px] opacity-80">Local: {weather?.location || "São Paulo"}</div>
              </div>
              {(() => {
                const Icon = weatherIcon;
                return <Icon className="h-12 w-12 drop-shadow-sm" style={{ color: weatherTheme.icon }} />;
              })()}
            </div>

            <div className="space-y-2 text-sm">
              {dailyList.slice(0, 3).map((d) => {
                const Icon = iconByCode(d.code);
                const dayLabel = new Date(d.date).toLocaleDateString("pt-BR", { weekday: "short" });
                const min = d.tmin ?? 0;
                const max = d.tmax ?? 0;
                const fillStart = ((min - scaleMin) / Math.max(1, scaleRange)) * 100;
                const fillEnd = ((max - scaleMin) / Math.max(1, scaleRange)) * 100;
                const gradient = `linear-gradient(90deg, rgba(59,130,246,0.35) ${fillStart}%, rgba(244,114,182,0.55) ${fillEnd}%, rgba(255,255,255,0.35) ${fillEnd}%)`;
                return (
                  <div key={d.date} className={`rounded-xl px-3 py-2 ${weatherTheme.cardBg} shadow-sm ring-1 ring-black/5`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: weatherTheme.icon }} />
                        <span className="font-semibold capitalize">{dayLabel}</span>
                      </div>
                      <span className="text-sm font-medium">{min}° / {max}°</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/40 ring-1 ring-black/5" style={{ background: gradient }} />
                  </div>
                );
              })}
            </div>

            <div className="text-right text-3xl font-bold tracking-tight drop-shadow-sm">
              {formatHour}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
