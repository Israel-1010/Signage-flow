"use client";

import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, Loader2, RefreshCw, ShieldCheck, Timer, Users } from "lucide-react";
import { GradientHero } from "@/components/gradient-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WifiAccessItem = {
  id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  ip_address: string | null;
  auth_provider: string | null;
  connected_at: string;
  disconnected_at: string | null;
  connected_seconds: number | null;
  device_type: string | null;
  os_name: string | null;
};

type WifiAccessResponse = {
  items: WifiAccessItem[];
  summary: {
    total: number;
    online: number;
    avgConnectedSeconds: number;
    byProvider: Record<string, number>;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  warning?: string;
};

const PROVIDERS = [
  { value: "all", label: "Todos" },
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "userpass", label: "Usuario e senha" },
  { value: "sms", label: "SMS" },
  { value: "voucher", label: "Voucher" },
];

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Falha ao carregar acessos");
  }
  return json as WifiAccessResponse;
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "-";

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function providerLabel(value: string | null) {
  const item = PROVIDERS.find((provider) => provider.value === value);
  if (item) return item.label;
  if (!value) return "Nao informado";
  return value;
}

export default function WifiAccessPage() {
  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [search, setSearch] = useState("");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState(format(fromDate, "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(now, "yyyy-MM-dd"));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (provider) params.set("provider", provider);
    if (status) params.set("status", status);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("page", String(page));
    params.set("page_size", String(pageSize));
    return `/api/wifi/accesses?${params.toString()}`;
  }, [search, provider, status, dateFrom, dateTo, page, pageSize]);

  const { data, error, isLoading, mutate } = useSWR<WifiAccessResponse>(
    query,
    fetcher,
    { refreshInterval: 15000 },
  );

  const items = data?.items || [];
  const totalPages = data?.pagination.totalPages || 1;

  const topProvider = useMemo(() => {
    const entries = Object.entries(data?.summary.byProvider || {});
    if (!entries.length) return "-";
    const [providerKey] = entries.sort((a, b) => b[1] - a[1])[0];
    return providerLabel(providerKey);
  }, [data?.summary.byProvider]);

  const exportCsv = () => {
    if (!items.length) return;

    const header = [
      "nome",
      "email",
      "ip",
      "autenticacao",
      "inicio",
      "fim",
      "tempo_conectado_seg",
      "dispositivo",
      "sistema",
      "status",
    ];

    const rows = items.map((item) => [
      item.visitor_name || "",
      item.visitor_email || "",
      item.ip_address || "",
      providerLabel(item.auth_provider),
      item.connected_at,
      item.disconnected_at || "",
      String(item.connected_seconds || 0),
      item.device_type || "",
      item.os_name || "",
      item.disconnected_at ? "offline" : "online",
    ]);

    const csv = [header.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wifi-acessos.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <GradientHero
        title="Acessos Wi-Fi"
        subtitle="Wi-Fi Marketing"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="bg-white text-rose-600 hover:bg-rose-50"
              onClick={() => mutate()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="secondary"
              className="bg-white text-rose-600 hover:bg-rose-50"
              onClick={exportCsv}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Total de acessos" value={String(data?.summary.total || 0)} icon={<Users className="h-5 w-5" />} />
        <KpiCard title="Conectados agora" value={String(data?.summary.online || 0)} icon={<ShieldCheck className="h-5 w-5" />} />
        <KpiCard title="Tempo medio" value={formatDuration(data?.summary.avgConnectedSeconds || 0)} icon={<Timer className="h-5 w-5" />} />
        <KpiCard title="Auth principal" value={topProvider} icon={<Users className="h-5 w-5" />} />
      </div>

      <Card>
        <CardContent className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1 lg:col-span-2">
            <label className="text-xs text-muted-foreground">Buscar</label>
            <Input
              placeholder="Nome, e-mail ou IP"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Autenticacao</label>
            <Select
              value={provider}
              onValueChange={(value) => {
                setProvider(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="offline">Offline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">De</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Ate</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(event) => {
                setDateTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Historico de acessos</CardTitle>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {data?.warning && <p className="text-sm text-amber-600">{data.warning}</p>}

          {!error && !isLoading && items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sem acessos no periodo filtrado.
            </p>
          )}

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">IP</th>
                  <th className="py-2 pr-3">Autenticacao</th>
                  <th className="py-2 pr-3">Inicio</th>
                  <th className="py-2 pr-3">Fim</th>
                  <th className="py-2 pr-3">Tempo</th>
                  <th className="py-2 pr-3">Dispositivo</th>
                  <th className="py-2 pr-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const online = !item.disconnected_at;
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{item.visitor_name || "Visitante"}</div>
                        <div className="text-xs text-muted-foreground">{item.visitor_email || "-"}</div>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">{item.ip_address || "-"}</td>
                      <td className="py-2 pr-3">{providerLabel(item.auth_provider)}</td>
                      <td className="py-2 pr-3">
                        {format(new Date(item.connected_at), "dd/MM/yyyy HH:mm:ss", {
                          locale: ptBR,
                        })}
                      </td>
                      <td className="py-2 pr-3">
                        {item.disconnected_at
                          ? format(new Date(item.disconnected_at), "dd/MM/yyyy HH:mm:ss", {
                              locale: ptBR,
                            })
                          : "-"}
                      </td>
                      <td className="py-2 pr-3">{formatDuration(item.connected_seconds)}</td>
                      <td className="py-2 pr-3">
                        {item.device_type || "-"}
                        {item.os_name ? ` / ${item.os_name}` : ""}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            online
                              ? "inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700"
                              : "inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                          }
                        >
                          {online ? "Online" : "Offline"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {data?.pagination.total || 0} registro(s) - pagina {page} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              >
                Proxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          {icon}
        </div>
        <div>
          <div className="text-xl font-semibold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
}
