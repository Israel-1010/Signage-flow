"use client";

import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import {
  BarChart3,
  CalendarRange,
  ExternalLink,
  Eye,
  Loader2,
  MousePointerClick,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { GradientHero } from "@/components/gradient-hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type CampaignStatus = "draft" | "active" | "paused" | "ended";

type Campaign = {
  id: string;
  name: string;
  headline: string | null;
  description: string | null;
  cta_label: string | null;
  cta_url: string | null;
  banner_url: string | null;
  status: CampaignStatus;
  start_at: string | null;
  end_at: string | null;
  priority: number;
  target_auth_providers: string[] | null;
  target_device_types: string[] | null;
  max_impressions_per_session: number | null;
  impressions_count: number;
  clicks_count: number;
  lifecycle?: "draft" | "active" | "paused" | "ended" | "scheduled";
  ctr?: number;
  created_at: string;
};

type CampaignResponse = {
  campaigns: Campaign[];
  warning?: string;
};

type CampaignForm = {
  id: string | null;
  name: string;
  headline: string;
  description: string;
  cta_label: string;
  cta_url: string;
  banner_url: string;
  status: CampaignStatus;
  start_at: string;
  end_at: string;
  priority: number;
  target_auth_providers: string[];
  target_device_types: string[];
  max_impressions_per_session: number | "";
};

const AUTH_OPTIONS = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "google", label: "Google" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
  { value: "userpass", label: "User and pass" },
];

const DEVICE_OPTIONS = [
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
  { value: "tablet", label: "Tablet" },
];

const emptyForm: CampaignForm = {
  id: null,
  name: "",
  headline: "",
  description: "",
  cta_label: "Saiba mais",
  cta_url: "",
  banner_url: "",
  status: "draft",
  start_at: "",
  end_at: "",
  priority: 100,
  target_auth_providers: [],
  target_device_types: [],
  max_impressions_per_session: "",
};

async function fetcher(url: string) {
  const response = await fetch(url);
  const json = (await response.json()) as CampaignResponse | { error: string };
  if (!response.ok) {
    throw new Error("error" in json ? json.error : "Failed to load campaigns");
  }
  return json as CampaignResponse;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function toLocalInput(dateIso: string | null) {
  if (!dateIso) return "";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const local = new Date(date.getTime() - offsetMs);
  return local.toISOString().slice(0, 16);
}

function statusBadgeClass(status: Campaign["lifecycle"]) {
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "paused") return "bg-amber-100 text-amber-700";
  if (status === "ended") return "bg-slate-200 text-slate-700";
  return "bg-slate-100 text-slate-600";
}

export default function WifiCampaignsPage() {
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const query = `/api/wifi/campaigns?status=${statusFilter}`;
  const { data, error, isLoading, mutate } = useSWR<CampaignResponse>(query, fetcher, {
    refreshInterval: 30000,
  });

  const campaigns = data?.campaigns || [];

  const summary = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((campaign) => campaign.lifecycle === "active").length;
    const impressions = campaigns.reduce(
      (sum, campaign) => sum + Number(campaign.impressions_count || 0),
      0,
    );
    const clicks = campaigns.reduce(
      (sum, campaign) => sum + Number(campaign.clicks_count || 0),
      0,
    );
    const ctr = impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
    return { total, active, impressions, clicks, ctr };
  }, [campaigns]);

  const startNew = () => {
    setForm(emptyForm);
    setActionError(null);
  };

  const editCampaign = (campaign: Campaign) => {
    setForm({
      id: campaign.id,
      name: campaign.name || "",
      headline: campaign.headline || "",
      description: campaign.description || "",
      cta_label: campaign.cta_label || "Saiba mais",
      cta_url: campaign.cta_url || "",
      banner_url: campaign.banner_url || "",
      status: campaign.status || "draft",
      start_at: toLocalInput(campaign.start_at),
      end_at: toLocalInput(campaign.end_at),
      priority: Number(campaign.priority || 100),
      target_auth_providers: campaign.target_auth_providers || [],
      target_device_types: campaign.target_device_types || [],
      max_impressions_per_session: campaign.max_impressions_per_session || "",
    });
    setActionError(null);
  };

  const saveCampaign = async () => {
    setSaving(true);
    setActionError(null);
    try {
      const payload = {
        ...form,
        start_at: form.start_at || null,
        end_at: form.end_at || null,
        max_impressions_per_session:
          form.max_impressions_per_session === ""
            ? null
            : Number(form.max_impressions_per_session),
      };

      const isEdit = Boolean(form.id);
      const endpoint = isEdit ? `/api/wifi/campaigns/${form.id}` : "/api/wifi/campaigns";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to save campaign");
      }

      await mutate();
      if (!isEdit) {
        startNew();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    setActionError(null);
    const ok = window.confirm("Remover esta campanha?");
    if (!ok) return;
    const response = await fetch(`/api/wifi/campaigns/${id}`, { method: "DELETE" });
    const json = await response.json();
    if (!response.ok) {
      setActionError(json.error || "Failed to delete campaign");
      return;
    }
    if (form.id === id) {
      startNew();
    }
    await mutate();
  };

  const updateCampaignStatus = async (campaign: Campaign, nextStatus: CampaignStatus) => {
    setActionError(null);
    const response = await fetch(`/api/wifi/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...campaign,
        status: nextStatus,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      setActionError(json.error || "Failed to update status");
      return;
    }
    await mutate();
  };

  const uploadBanner = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setActionError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/wifi/campaigns/upload", {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Failed to upload banner");
      }
      setForm((prev) => ({ ...prev, banner_url: json.url }));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleProvider = (value: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      target_auth_providers: checked
        ? [...prev.target_auth_providers, value]
        : prev.target_auth_providers.filter((item) => item !== value),
    }));
  };

  const toggleDevice = (value: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      target_device_types: checked
        ? [...prev.target_device_types, value]
        : prev.target_device_types.filter((item) => item !== value),
    }));
  };

  return (
    <div className="space-y-6">
      <GradientHero
        title="Campanhas Wi-Fi"
        subtitle="Wi-Fi Marketing"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="bg-white text-rose-600 hover:bg-rose-50"
              onClick={() => mutate()}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button
              variant="secondary"
              className="bg-white text-rose-600 hover:bg-rose-50"
              onClick={startNew}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova campanha
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Campanhas" value={String(summary.total)} icon={<CalendarRange className="h-4 w-4" />} />
        <SummaryCard title="Ativas agora" value={String(summary.active)} icon={<PlayCircle className="h-4 w-4" />} />
        <SummaryCard title="Impressoes" value={String(summary.impressions)} icon={<Eye className="h-4 w-4" />} />
        <SummaryCard title="Cliques" value={String(summary.clicks)} icon={<MousePointerClick className="h-4 w-4" />} />
        <SummaryCard title="CTR medio" value={`${summary.ctr}%`} icon={<ExternalLink className="h-4 w-4" />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{form.id ? "Editar campanha" : "Nova campanha"}</CardTitle>
            <CardDescription>
              Banner, janela de exibicao, segmentacao e metrica de cliques.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome interno</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder="Campanha Dia das Maes"
              />
            </div>

            <div className="space-y-1">
              <Label>Headline</Label>
              <Input
                value={form.headline}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, headline: event.target.value }))
                }
                placeholder="Ganhe 10% no primeiro pedido"
              />
            </div>

            <div className="space-y-1">
              <Label>Descricao</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Detalhe curto da oferta"
                rows={3}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>CTA label</Label>
                <Input
                  value={form.cta_label}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, cta_label: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: CampaignStatus) =>
                    setForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>CTA URL</Label>
              <Input
                value={form.cta_url}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, cta_url: event.target.value }))
                }
                placeholder="https://suaoferta.com/landing"
              />
            </div>

            <div className="space-y-2">
              <Label>Banner</Label>
              <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-orange-300 p-3 text-sm text-slate-600 hover:bg-orange-50">
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Enviar banner"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => uploadBanner(event.target.files?.[0] || null)}
                />
              </label>
              {form.banner_url ? (
                <img
                  src={form.banner_url}
                  alt="Banner"
                  className="h-28 w-full rounded-md object-cover"
                />
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Inicio</Label>
                <Input
                  type="datetime-local"
                  value={form.start_at}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, start_at: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={form.end_at}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, end_at: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={form.priority}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Max impressoes por sessao</Label>
                <Input
                  type="number"
                  value={form.max_impressions_per_session}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      max_impressions_per_session:
                        event.target.value === "" ? "" : Number(event.target.value),
                    }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Segmentacao por autenticacao</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {AUTH_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <Checkbox
                      checked={form.target_auth_providers.includes(option.value)}
                      onCheckedChange={(checked) =>
                        toggleProvider(option.value, Boolean(checked))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Segmentacao por dispositivo</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {DEVICE_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-md border p-2 text-sm"
                  >
                    <Checkbox
                      checked={form.target_device_types.includes(option.value)}
                      onCheckedChange={(checked) =>
                        toggleDevice(option.value, Boolean(checked))
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {actionError ? (
              <p className="text-sm text-destructive">{actionError}</p>
            ) : null}

            <div className="flex items-center gap-2">
              <Button onClick={saveCampaign} disabled={saving || uploading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar campanha
              </Button>
              <Button variant="outline" onClick={startNew}>
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Lista de campanhas</CardTitle>
              <CardDescription>
                Metricas de impressao, clique e performance por periodo.
              </CardDescription>
            </div>
            <div className="w-[170px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando campanhas...
              </div>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
            {data?.warning ? (
              <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-700">{data.warning}</p>
            ) : null}

            {!isLoading && campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma campanha cadastrada.</p>
            ) : null}

            <div className="space-y-2">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      {campaign.banner_url ? (
                        <img
                          src={campaign.banner_url}
                          alt={campaign.name}
                          className="h-16 w-24 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-24 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">
                          Sem banner
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-slate-900">{campaign.name}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(
                              campaign.lifecycle,
                            )}`}
                          >
                            {campaign.lifecycle || campaign.status}
                          </span>
                        </div>
                        <p className="truncate text-sm text-slate-600">
                          {campaign.headline || campaign.description || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          Janela: {formatDate(campaign.start_at)} ate {formatDate(campaign.end_at)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm lg:w-[320px]">
                      <MetricChip label="Impress." value={String(campaign.impressions_count || 0)} />
                      <MetricChip label="Cliques" value={String(campaign.clicks_count || 0)} />
                      <MetricChip
                        label="CTR"
                        value={`${campaign.ctr ?? 0}%`}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editCampaign(campaign)}
                    >
                      Editar
                    </Button>
                    {campaign.status === "active" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign, "paused")}
                      >
                        <PauseCircle className="mr-1 h-4 w-4" />
                        Pausar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateCampaignStatus(campaign, "active")}
                      >
                        <PlayCircle className="mr-1 h-4 w-4" />
                        Ativar
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteCampaign(campaign.id)}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Remover
                    </Button>
                    {campaign.cta_url ? (
                      <a
                        href={campaign.cta_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-xs text-orange-600 hover:underline"
                      >
                        Abrir destino
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className="text-lg font-semibold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-center">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value}</p>
    </div>
  );
}
