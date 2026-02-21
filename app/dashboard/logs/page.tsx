"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Loader2, RefreshCw, FileSpreadsheet, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LogItem = {
  player_id: string;
  playlist_id: string | null;
  item_id: string;
  item_type: string;
  title: string | null;
  started_at: string;
  duration_seconds: number | null;
  status: string;
  details?: { url?: string | null } | null;
};

type ReportResponse = {
  total: number;
  totalDurationSeconds: number;
  byType: Record<string, number>;
  items: LogItem[];
};

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error("Falha ao carregar logs");
  return r.json();
});

const playersFetcher = async () => {
  const res = await fetch("/api/players");
  if (!res.ok) throw new Error("Falha ao carregar players");
  const data = await res.json();
  return data.players as { id: string; name: string }[];
};

export default function LogsPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [playerId, setPlayerId] = useState("all");
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [refreshInterval, setRefreshInterval] = useState(10000);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (playerId && playerId !== "all") params.append("player_id", playerId);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    return `/api/reports/playback?${params.toString()}`;
  }, [playerId, dateFrom, dateTo]);

  const { data, isLoading, error, mutate } = useSWR<ReportResponse>(query, fetcher, {
    refreshInterval,
  });
  const { data: players } = useSWR("/api/players", playersFetcher);

  const items = data?.items || [];

  const exportCsv = () => {
    if (!items.length) return;
    const header = ["player_name", "player_id", "playlist_id", "item_id", "item_type", "title", "started_at", "duration_seconds", "status", "url"];
    const rows = items.map((r) => {
      const playerName = players?.find((p) => p.id === r.player_id)?.name || "";
      return [
        playerName,
        r.player_id,
        r.playlist_id ?? "",
        r.item_id,
        r.item_type,
        r.title ?? "",
        r.started_at,
        r.duration_seconds ?? "",
        r.status,
        r.details?.url ?? "",
      ].join(";");
    });
    const blob = new Blob([header.join(";") + "\n" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playback_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print(); // simples: usa print para PDF
  };

  const humanDuration = (seconds: number | null) => {
    if (!seconds || seconds <= 0) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatório de Exibição</h1>
          <p className="text-sm text-muted-foreground">Eventos em tempo real do que passou em cada player.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mutate()}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Excel (CSV)
          </Button>
          <Button variant="outline" onClick={exportPdf}>
            <FileText className="h-4 w-4 mr-2" /> Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 py-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Player</label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {players?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name || p.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Até</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Auto-refresh</label>
            <Select value={String(refreshInterval)} onValueChange={(v) => setRefreshInterval(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Desligado</SelectItem>
                <SelectItem value="5000">5s</SelectItem>
                <SelectItem value="10000">10s</SelectItem>
                <SelectItem value="30000">30s</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Eventos</CardTitle>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </CardHeader>
          <CardContent className="overflow-auto max-h-[60vh]">
            {error && <p className="text-sm text-destructive">Erro ao carregar logs.</p>}
            {!error && items.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem eventos no período.</p>
            )}
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b">
                <tr className="text-left">
                  <th className="py-2 pr-4">Quando</th>
                  <th className="py-2 pr-4">Player</th>
                  <th className="py-2 pr-4">Tipo</th>
                  <th className="py-2 pr-4">Item</th>
                  <th className="py-2 pr-4">Duração</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((log) => {
                  const playerName = players?.find((p) => p.id === log.player_id)?.name;
                  const displayName = playerName || "Sem nome";
                  return (
                  <tr key={`${log.player_id}-${log.started_at}-${log.item_id}`} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      {format(new Date(log.started_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </td>
                    <td className="py-2 pr-4">
                      <div className="font-medium">{displayName}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{log.player_id.slice(0, 8)}</div>
                    </td>
                    <td className="py-2 pr-4 capitalize">{log.item_type}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2 max-w-[260px]">
                        {log.details?.url ? (
                          log.item_type === "video" ? (
                            <div className="h-10 w-14 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">VID</div>
                          ) : (
                            <img
                              src={log.details.url}
                              alt={log.title || "thumb"}
                              className="h-10 w-14 rounded object-cover"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )
                        ) : (
                          <div className="h-10 w-14 rounded bg-muted" />
                        )}
                        <span className="truncate">{log.title || "-"}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-4">{humanDuration(log.duration_seconds)}</td>
                    <td className="py-2 pr-4">{log.status}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Eventos</span>
              <span className="font-semibold">{data?.total ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Duração total</span>
              <span className="font-semibold">{humanDuration(data?.totalDurationSeconds ?? 0)}</span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Por tipo</p>
              {data?.byType
                ? Object.entries(data.byType).map(([type, count]) => (
                    <div className="flex items-center justify-between" key={type}>
                      <span className="capitalize">{type}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))
                : <p className="text-xs text-muted-foreground">Sem dados</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
