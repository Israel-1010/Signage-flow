"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  BarChart3,
  Eye,
  ExternalLink,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CampaignStatus = "draft" | "active" | "paused" | "ended";
type Lifecycle = "draft" | "active" | "paused" | "ended" | "scheduled";

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
  lifecycle?: Lifecycle;
  ctr?: number;
};

type CampaignResponse = { campaigns: Campaign[]; warning?: string };

type FormState = {
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

const AUTH_OPTIONS = ["cpf", "email", "google", "facebook", "linkedin", "tiktok", "x", "userpass"];
const DEVICE_OPTIONS = ["mobile", "desktop", "tablet"];
const STEPS = ["Conteudo", "Oferta", "Regras", "Revisao"];

const emptyForm: FormState = {
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

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const json = await response.json();
  if (!response.ok) throw new Error(json.error || "Falha ao carregar campanhas");
  return json as CampaignResponse;
};

const statusClass = (status?: Lifecycle) =>
  status === "active"
    ? "bg-emerald-100 text-emerald-700"
    : status === "scheduled"
      ? "bg-blue-100 text-blue-700"
      : status === "paused"
        ? "bg-amber-100 text-amber-700"
        : status === "ended"
          ? "bg-slate-200 text-slate-700"
          : "bg-slate-100 text-slate-600";

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const payloadFromForm = (form: FormState) => ({
  name: form.name,
  headline: form.headline,
  description: form.description,
  cta_label: form.cta_label,
  cta_url: form.cta_url,
  banner_url: form.banner_url,
  status: form.status,
  start_at: form.start_at || null,
  end_at: form.end_at || null,
  priority: Number(form.priority || 0),
  target_auth_providers: form.target_auth_providers,
  target_device_types: form.target_device_types,
  max_impressions_per_session:
    form.max_impressions_per_session === "" ? null : Number(form.max_impressions_per_session),
});

export default function WifiCampaignsPage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [statusFilter, setStatusFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorAction, setErrorAction] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const { data, isLoading, error, mutate } = useSWR<CampaignResponse>(
    `/api/wifi/campaigns?status=${statusFilter}`,
    fetcher,
    { refreshInterval: 10000 },
  );

  const campaigns = data?.campaigns || [];
  const summary = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((item) => item.lifecycle === "active").length;
    const impressions = campaigns.reduce((sum, item) => sum + Number(item.impressions_count || 0), 0);
    const clicks = campaigns.reduce((sum, item) => sum + Number(item.clicks_count || 0), 0);
    const ctr = impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0;
    return { total, active, impressions, clicks, ctr };
  }, [campaigns]);

  const openCreate = () => {
    setForm(emptyForm);
    setStep(0);
    setErrorAction(null);
    setOpen(true);
  };

  const openEdit = (campaign: Campaign) => {
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
    setStep(0);
    setErrorAction(null);
    setOpen(true);
  };

  const validate = () => {
    if (step === 0 && (!form.name.trim() || !form.headline.trim())) return "Preencha nome e headline.";
    if (step === 1 && (!form.banner_url || !form.cta_url.trim() || !form.cta_label.trim())) {
      return "Preencha banner, CTA e URL.";
    }
    if (step === 2 && form.start_at && form.end_at && new Date(form.end_at) < new Date(form.start_at)) {
      return "Data final menor que a inicial.";
    }
    return null;
  };

  const saveCampaign = async () => {
    setSaving(true);
    setErrorAction(null);
    try {
      const endpoint = form.id ? `/api/wifi/campaigns/${form.id}` : "/api/wifi/campaigns";
      const method = form.id ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(form)),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha ao salvar");
      await mutate();
      setOpen(false);
    } catch (err) {
      setErrorAction(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (campaign: Campaign, status: CampaignStatus) => {
    const response = await fetch(`/api/wifi/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payloadFromForm({
          id: campaign.id,
          name: campaign.name || "",
          headline: campaign.headline || "",
          description: campaign.description || "",
          cta_label: campaign.cta_label || "Saiba mais",
          cta_url: campaign.cta_url || "",
          banner_url: campaign.banner_url || "",
          status,
          start_at: toLocalInput(campaign.start_at),
          end_at: toLocalInput(campaign.end_at),
          priority: campaign.priority || 100,
          target_auth_providers: campaign.target_auth_providers || [],
          target_device_types: campaign.target_device_types || [],
          max_impressions_per_session: campaign.max_impressions_per_session || "",
        }),
      }),
    });
    if (response.ok) await mutate();
  };

  const removeCampaign = async (id: string) => {
    if (!window.confirm("Remover esta campanha?")) return;
    const response = await fetch(`/api/wifi/campaigns/${id}`, { method: "DELETE" });
    if (response.ok) await mutate();
  };

  const uploadBanner = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch("/api/wifi/campaigns/upload", { method: "POST", body: data });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Falha no upload");
      setForm((prev) => ({ ...prev, banner_url: json.url }));
    } catch (err) {
      setErrorAction(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const toggleAuth = (value: string, checked: boolean) =>
    setForm((prev) => ({
      ...prev,
      target_auth_providers: checked
        ? [...prev.target_auth_providers, value]
        : prev.target_auth_providers.filter((item) => item !== value),
    }));

  const toggleDevice = (value: string, checked: boolean) =>
    setForm((prev) => ({
      ...prev,
      target_device_types: checked
        ? [...prev.target_device_types, value]
        : prev.target_device_types.filter((item) => item !== value),
    }));

  return (
    <div className="space-y-6">
      <GradientHero
        title="Campanhas Wi-Fi"
        subtitle="Wi-Fi Marketing"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="bg-white text-rose-600 hover:bg-rose-50" onClick={() => mutate()}>
              <BarChart3 className="mr-2 h-4 w-4" /> Atualizar
            </Button>
            <Button variant="secondary" className="bg-white text-rose-600 hover:bg-rose-50" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Criar nova campanha
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="Campanhas" value={String(summary.total)} icon={<BarChart3 className="h-4 w-4" />} />
        <SummaryCard title="Ativas agora" value={String(summary.active)} icon={<PlayCircle className="h-4 w-4" />} />
        <SummaryCard title="Impressoes" value={String(summary.impressions)} icon={<Eye className="h-4 w-4" />} />
        <SummaryCard title="Cliques" value={String(summary.clicks)} icon={<MousePointerClick className="h-4 w-4" />} />
        <SummaryCard title="CTR medio" value={`${summary.ctr}%`} icon={<ExternalLink className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Suas campanhas</CardTitle>
            <CardDescription>Status e cliques em tempo real (atualiza a cada 10s).</CardDescription>
          </div>
          <div className="w-[170px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {error && <p className="text-sm text-destructive">{error.message}</p>}
          {data?.warning && <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-700">{data.warning}</p>}

          <div className="grid gap-3 md:grid-cols-2">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  {campaign.banner_url ? (
                    <img src={campaign.banner_url} alt={campaign.name} className="h-20 w-28 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-20 w-28 items-center justify-center rounded-md bg-slate-100 text-xs text-slate-500">Sem banner</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{campaign.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass(campaign.lifecycle)}`}>
                        {campaign.lifecycle || campaign.status}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-600">{campaign.headline || campaign.description || "-"}</p>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                      <MetricChip label="Imp." value={String(campaign.impressions_count || 0)} />
                      <MetricChip label="Clicks" value={String(campaign.clicks_count || 0)} />
                      <MetricChip label="CTR" value={`${campaign.ctr ?? 0}%`} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(campaign)}>Editar</Button>
                  {campaign.status === "active" ? (
                    <Button variant="outline" size="sm" onClick={() => updateStatus(campaign, "paused")}><PauseCircle className="mr-1 h-4 w-4" />Pausar</Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => updateStatus(campaign, "active")}><PlayCircle className="mr-1 h-4 w-4" />Ativar</Button>
                  )}
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeCampaign(campaign.id)}>
                    <Trash2 className="mr-1 h-4 w-4" />Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar campanha" : "Criar nova campanha"}</DialogTitle>
            <DialogDescription>Fluxo em etapas para cadastro da campanha.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {STEPS.map((item, index) => (
                <div
                  key={item}
                  className={`rounded-md border px-3 py-2 text-xs ${
                    index === step
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : index < step
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  {index + 1}. {item}
                </div>
              ))}
            </div>

            {step === 0 && (
              <div className="grid gap-4">
                <div className="space-y-1"><Label>Nome da campanha</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-1"><Label>Headline</Label><Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></div>
                <div className="space-y-1"><Label>Descricao</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1"><Label>Texto CTA</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
                  <div className="space-y-1"><Label>URL destino</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Banner</Label>
                  <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-orange-300 p-3 text-sm text-slate-600 hover:bg-orange-50">
                    <Upload className="mr-2 h-4 w-4" />{uploading ? "Enviando..." : "Enviar banner"}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadBanner(e.target.files?.[0] || null)} />
                  </label>
                  {form.banner_url && <img src={form.banner_url} alt="banner" className="h-36 w-full rounded-md object-cover" />}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1"><Label>Status</Label>
                    <Select value={form.status} onValueChange={(v: CampaignStatus) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="paused">Paused</SelectItem><SelectItem value="ended">Ended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Prioridade</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value || 0) })} /></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1"><Label>Inicio</Label><Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Fim</Label><Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><Label>Max impressoes/sessao</Label><Input type="number" value={form.max_impressions_per_session} onChange={(e) => setForm({ ...form, max_impressions_per_session: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Segmentacao por autenticacao</Label><div className="grid gap-2 sm:grid-cols-4">{AUTH_OPTIONS.map((v) => <label key={v} className="flex items-center gap-2 rounded border p-2 text-sm"><Checkbox checked={form.target_auth_providers.includes(v)} onCheckedChange={(checked) => toggleAuth(v, Boolean(checked))} /><span>{v}</span></label>)}</div></div>
                <div className="space-y-2"><Label>Segmentacao por dispositivo</Label><div className="grid gap-2 sm:grid-cols-3">{DEVICE_OPTIONS.map((v) => <label key={v} className="flex items-center gap-2 rounded border p-2 text-sm"><Checkbox checked={form.target_device_types.includes(v)} onCheckedChange={(checked) => toggleDevice(v, Boolean(checked))} /><span>{v}</span></label>)}</div></div>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-4 md:grid-cols-[1fr_260px]">
                <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                  <p className="text-lg font-semibold">{form.name || "Sem nome"}</p>
                  <p className="text-sm text-slate-600">{form.headline || "-"}</p>
                  <p className="text-xs text-slate-500">{form.description || "-"}</p>
                  <p className="text-xs text-slate-500"><strong>Status:</strong> {form.status} | <strong>Prioridade:</strong> {form.priority}</p>
                  <p className="text-xs text-slate-500"><strong>URL:</strong> {form.cta_url || "-"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  {form.banner_url ? <img src={form.banner_url} alt="preview" className="h-32 w-full rounded object-cover" /> : <div className="flex h-32 items-center justify-center rounded bg-slate-100 text-xs text-slate-500">Sem banner</div>}
                  <button type="button" className="mt-3 w-full rounded-md bg-orange-500 py-2 text-sm font-semibold text-white">{form.cta_label || "Saiba mais"}</button>
                </div>
              </div>
            )}

            {errorAction && <p className="text-sm text-destructive">{errorAction}</p>}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-xs text-slate-500">Etapa {step + 1} de {STEPS.length}</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0 || saving}>Voltar</Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={() => {
                  const issue = validate();
                  if (issue) return setErrorAction(issue);
                  setErrorAction(null);
                  setStep(step + 1);
                }}>Proximo</Button>
              ) : (
                <Button onClick={saveCampaign} disabled={saving || uploading}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Salvar campanha
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-600">{icon}</div>
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
