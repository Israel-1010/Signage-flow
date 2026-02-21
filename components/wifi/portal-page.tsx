"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  Smartphone,
  Monitor,
  Save,
  Globe2,
  Copy,
  Link2,
  IdCard,
  Mail,
  Facebook,
  Chrome,
  Linkedin,
  Music2,
  Twitter,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react";
import Image from "next/image";

interface PortalData {
  id?: string;
  name: string;
  logo_url?: string | null;
  background_url?: string | null;
  banner_url?: string | null;
  html?: string;
  css?: string;
  theme?: "classic" | "modern";
  status: "draft" | "published";
  updated_at?: string;
  token?: string;
  auth_options?: {
    cpf?: boolean;
    email?: boolean;
    google?: boolean;
    facebook?: boolean;
    linkedin?: boolean;
    tiktok?: boolean;
    x?: boolean;
    terms?: boolean;
    age?: boolean;
    userpass?: boolean;
  };
}

const uploader = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/wifi/portal/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Falha no upload");
  const data = await res.json();
  return data.url as string;
};

export function WifiPortalPage() {
  const { data } = useSWR<PortalData>("/api/wifi/portal", async (url) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error("Falha ao carregar portal");
    return r.json();
  });

  const [saving, setSaving] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [authOptions, setAuthOptions] = useState({
    cpf: true,
    email: true,
    google: true,
    facebook: true,
    linkedin: true,
    tiktok: true,
    x: false,
    terms: true,
    age: true,
    userpass: true,
  });

  const [form, setForm] = useState<PortalData>({
    name: "Meu Portal",
    html: "",
    css: "",
    theme: "modern",
    status: "draft",
    token: "",
  });
  const [publicUrl, setPublicUrl] = useState<string>("");
  const desktopContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileContainerRef = useRef<HTMLDivElement | null>(null);
  const desktopIframeRef = useRef<HTMLIFrameElement | null>(null);
  const mobileIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [desktopDocHeight, setDesktopDocHeight] = useState(900);
  const [mobileDocHeight, setMobileDocHeight] = useState(900);
  const [desktopScale, setDesktopScale] = useState(1);
  const [mobileScale, setMobileScale] = useState(1);
  const DESKTOP_BASE_WIDTH = 1366;
  const MOBILE_BASE_WIDTH = 390;
  const wizardSteps = [
    { id: "login", label: "Tipo de login", hint: "Metodos de acesso" },
    { id: "theme", label: "Tema", hint: "Visual do portal" },
    { id: "identity", label: "Identidade", hint: "Logo e imagens" },
    { id: "preview", label: "Preview", hint: "Resultado final" },
  ] as const;
  type WizardStep = (typeof wizardSteps)[number]["id"];
  const [activeStep, setActiveStep] = useState<WizardStep>("login");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPublicUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (data) {
      setForm({
        ...data,
        theme: data.theme === "classic" ? "classic" : "modern",
      });
      setAuthOptions({
        cpf: data.auth_options?.cpf ?? true,
        email: data.auth_options?.email ?? true,
        google: data.auth_options?.google ?? true,
        facebook: data.auth_options?.facebook ?? true,
        linkedin: data.auth_options?.linkedin ?? true,
        tiktok: data.auth_options?.tiktok ?? true,
        x: data.auth_options?.x ?? false,
        terms: data.auth_options?.terms ?? true,
        age: data.auth_options?.age ?? true,
        userpass: data.auth_options?.userpass ?? true,
      });
    }
  }, [data]);

  const handleUpload = async (field: "logo_url" | "background_url" | "banner_url", file?: File | null) => {
    if (!file) return;
    try {
      const url = await uploader(file);
      setForm((f) => ({ ...f, [field]: url }));
      toast.success("Upload concluido");
    } catch (e: any) {
      toast.error(e.message || "Erro no upload");
    }
  };

  const savePortal = async (status: "draft" | "published") => {
    setSaving(true);
    try {
      const res = await fetch("/api/wifi/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status, auth_options: authOptions }),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      const saved = await res.json();
      toast.success(status === "published" ? "Portal publicado" : "Rascunho salvo");
      if (saved.warning) {
        toast.warning(saved.warning);
      }
      mutate("/api/wifi/portal");
      setForm((f) => ({ ...f, status, token: saved.token || f.token }));
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = useMemo(() => {
    const css = form.css || "";
    const body =
      form.html && form.html.trim().length > 0
        ? form.html
        : buildAuthTemplate(form.name || "Rede Wi-Fi", authOptions, {
            logo: form.logo_url,
            background: form.background_url,
            banner: form.banner_url,
          }, form.theme === "classic" ? "classic" : "modern");
    return `<!doctype html><html><head><style>${css}</style></head><body>${body}</body></html>`;
  }, [form.html, form.css, form.name, form.theme, authOptions, form.logo_url, form.background_url, form.banner_url]);

  const measureIframeHeight = (iframe: HTMLIFrameElement | null, fallback: number) => {
    if (!iframe?.contentDocument) return fallback;
    const { body, documentElement } = iframe.contentDocument;
    return Math.max(
      body?.scrollHeight || 0,
      documentElement?.scrollHeight || 0,
      body?.offsetHeight || 0,
      documentElement?.offsetHeight || 0,
      fallback
    );
  };

  const recalcDesktopScale = () => {
    const container = desktopContainerRef.current;
    if (!container) return;
    const availableW = Math.max(container.clientWidth - 16, 0);
    const availableH = Math.max(container.clientHeight - 16, 0);
    const nextScale = Math.min(availableW / DESKTOP_BASE_WIDTH, availableH / desktopDocHeight, 1);
    setDesktopScale(nextScale > 0 ? nextScale : 1);
  };

  const recalcMobileScale = () => {
    const container = mobileContainerRef.current;
    if (!container) return;
    const availableW = Math.max(container.clientWidth - 8, 0);
    const availableH = Math.max(container.clientHeight - 8, 0);
    const nextScale = Math.min(availableW / MOBILE_BASE_WIDTH, availableH / mobileDocHeight, 1);
    setMobileScale(nextScale > 0 ? nextScale : 1);
  };

  const handleDesktopLoad = () => {
    const apply = () => {
      const height = measureIframeHeight(desktopIframeRef.current, 900);
      setDesktopDocHeight(height);
    };
    apply();
    window.setTimeout(apply, 120);
    window.setTimeout(apply, 380);
  };

  const handleMobileLoad = () => {
    const apply = () => {
      const height = measureIframeHeight(mobileIframeRef.current, 900);
      setMobileDocHeight(height);
    };
    apply();
    window.setTimeout(apply, 120);
    window.setTimeout(apply, 380);
  };

  useEffect(() => {
    recalcDesktopScale();
  }, [desktopDocHeight]);

  useEffect(() => {
    recalcMobileScale();
  }, [mobileDocHeight]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      recalcDesktopScale();
      recalcMobileScale();
    });
    if (desktopContainerRef.current) observer.observe(desktopContainerRef.current);
    if (mobileContainerRef.current) observer.observe(mobileContainerRef.current);
    return () => observer.disconnect();
  }, [desktopDocHeight, mobileDocHeight]);

  const currentStepIndex = wizardSteps.findIndex((step) => step.id === activeStep);
  const isFirstStep = currentStepIndex <= 0;
  const isLastStep = currentStepIndex >= wizardSteps.length - 1;

  const goPrevStep = () => {
    if (isFirstStep) return;
    setActiveStep(wizardSteps[currentStepIndex - 1].id);
  };

  const goNextStep = () => {
    if (isLastStep) return;
    setActiveStep(wizardSteps[currentStepIndex + 1].id);
  };

  return (
    <div className="space-y-4 rounded-2xl bg-slate-50/60 p-4">
      <Card className="border-slate-200 bg-white/90 shadow-sm">
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-xl">Configuração do Portal Wi-Fi</CardTitle>
            <CardDescription>
              Avance por etapas: login, tema, identidade e preview final.
            </CardDescription>
          </div>
          <div className="grid gap-2 md:grid-cols-4">
            {wizardSteps.map((step, index) => {
              const isActive = step.id === activeStep;
              const isCompleted = index < currentStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveStep(step.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-orange-300 bg-orange-50"
                      : isCompleted
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isActive
                          ? "bg-orange-500 text-white"
                          : isCompleted
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{step.label}</span>
                  </div>
                  <p className="text-xs text-slate-500">{step.hint}</p>
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {activeStep === "login" && (
            <Card className="border-slate-100 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Tipo de login</CardTitle>
                <CardDescription>Selecione os metodos que serao exibidos no hotspot.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 md:grid-cols-2">
                {([
                  ["cpf", "Login com CPF", IdCard, "#1474e4"],
                  ["email", "Login com E-mail", Mail, "#6b45c6"],
                  ["google", "Login com Google", Chrome, "#4285f4"],
                  ["facebook", "Login com Facebook", Facebook, "#1877f2"],
                  ["linkedin", "Login com LinkedIn", Linkedin, "#0a66c2"],
                  ["tiktok", "Login com TikTok", Music2, "#111111"],
                  ["x", "Login com X", Twitter, "#000000"],
                  ["userpass", "Usuario e Senha", IdCard, "#4b5563"],
                  ["terms", "Termos de uso", IdCard, "#f97316"],
                  ["age", "Maior de 18 anos", IdCard, "#f97316"],
                ] as const).map(([key, label, Icon, color]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                        style={{ background: color as string }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm text-slate-800">{label}</span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-orange-500"
                      checked={authOptions[key]}
                      onChange={(e) => setAuthOptions((o) => ({ ...o, [key]: e.target.checked }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeStep === "theme" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Tema</CardTitle>
                  <CardDescription>Escolha o estilo visual do portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={form.theme === "classic" ? "classic" : "modern"}
                    onValueChange={(value) =>
                      setForm((f) => ({
                        ...f,
                        theme: value === "classic" ? "classic" : "modern",
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Pre-visualizacao do tema</CardTitle>
                  <CardDescription>Escolha rapida entre os dois estilos.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, theme: "modern" }))}
                    className={`rounded-xl border px-4 py-4 text-left ${
                      form.theme !== "classic"
                        ? "border-orange-300 bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">Modern</p>
                    <p className="mt-1 text-xs text-slate-500">Hero azul e look contemporaneo.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, theme: "classic" }))}
                    className={`rounded-xl border px-4 py-4 text-left ${
                      form.theme === "classic"
                        ? "border-orange-300 bg-orange-50"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-900">Classic</p>
                    <p className="mt-1 text-xs text-slate-500">Layout tradicional com botoes compactos.</p>
                  </button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeStep === "identity" && (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Identidade</CardTitle>
                  <CardDescription>Nome, logo, fundo e banner do portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Nome do portal</Label>
                    <Input
                      className="bg-white"
                      value={form.name || ""}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ex: WiFire Shopping"
                    />
                  </div>
                  <UploadInput
                    label="Logo"
                    name="logo"
                    helper="Ideal 512x512, PNG/SVG"
                    onSelect={(f) => handleUpload("logo_url", f)}
                    preview={form.logo_url}
                  />
                  <UploadInput
                    label="Background"
                    name="background"
                    helper="Imagem de fundo opcional"
                    onSelect={(f) => handleUpload("background_url", f)}
                    preview={form.background_url}
                  />
                  <UploadInput
                    label="Banner"
                    name="banner"
                    helper="Faixa horizontal opcional"
                    onSelect={(f) => handleUpload("banner_url", f)}
                    preview={form.banner_url}
                  />
                </CardContent>
              </Card>

              <Card className="border-slate-100 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Link publico</CardTitle>
                  <CardDescription>Copie o token e a URL final do portal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Token</Label>
                    <div className="flex items-center gap-2">
                      <Input readOnly value={form.token || ""} className="bg-white" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => form.token && navigator.clipboard?.writeText(form.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>URL publica</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={form.token ? `${publicUrl || ""}/wifi/portal/${form.token}` : ""}
                        className="bg-white"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          form.token &&
                          navigator.clipboard?.writeText(`${publicUrl || ""}/wifi/portal/${form.token}`)
                        }
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeStep === "preview" && (
            <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
              <div className="space-y-4">
                <Card className="border-slate-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Publicacao</CardTitle>
                    <CardDescription>Finalize e publique seu portal.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <RadioGroup
                      value={form.status}
                      onValueChange={(v) => setForm((f) => ({ ...f, status: v as PortalData["status"] }))}
                      className="grid grid-cols-2 gap-2"
                    >
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <RadioGroupItem value="draft" id="draft" />
                        <span>Rascunho</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <RadioGroupItem value="published" id="published" />
                        <span>Publicado</span>
                      </label>
                    </RadioGroup>
                    <div className="flex gap-2">
                      <Button disabled={saving} onClick={() => savePortal("draft")} variant="outline">
                        <Save className="h-4 w-4" /> Rascunho
                      </Button>
                      <Button disabled={saving} onClick={() => savePortal("published")}>
                        <Globe2 className="h-4 w-4" /> Publicar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-100 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Como ficara</CardTitle>
                    <CardDescription>
                      Essa visualizacao representa o resultado final da tela de login.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>

              <Card className="overflow-hidden border-slate-100 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Preview final</CardTitle>
                    <CardDescription>Desktop e mobile</CardDescription>
                  </div>
                  <Tabs value={previewDevice} onValueChange={(v) => setPreviewDevice(v as "desktop" | "mobile")}>
                    <TabsList>
                      <TabsTrigger value="desktop" className="gap-2">
                        <Monitor className="h-4 w-4" /> Desktop
                      </TabsTrigger>
                      <TabsTrigger value="mobile" className="gap-2">
                        <Smartphone className="h-4 w-4" /> Mobile
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center rounded-xl bg-slate-50/60 p-4">
                    {previewDevice === "desktop" ? (
                      <div
                        ref={desktopContainerRef}
                        className="relative h-[700px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow"
                      >
                        <div
                          className="absolute left-1/2 top-2"
                          style={{
                            width: DESKTOP_BASE_WIDTH,
                            height: desktopDocHeight,
                            transform: `translateX(-50%) scale(${desktopScale})`,
                            transformOrigin: "top center",
                          }}
                        >
                          <iframe
                            key={`desk-${form.theme}-${JSON.stringify(authOptions)}`}
                            ref={desktopIframeRef}
                            onLoad={handleDesktopLoad}
                            srcDoc={previewHtml}
                            scrolling="no"
                            className="pointer-events-none block border-0 bg-white"
                            style={{
                              width: `${DESKTOP_BASE_WIDTH}px`,
                              height: `${desktopDocHeight}px`,
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-[720px] w-[380px]">
                        <div className="absolute inset-0 mx-auto flex h-full w-[360px] flex-col items-center rounded-[32px] border-[10px] border-slate-900 bg-slate-900 shadow-xl">
                          <div className="mt-3 h-6 w-32 rounded-full bg-slate-800" />
                          <div
                            ref={mobileContainerRef}
                            className="relative mt-3 h-[640px] w-[320px] overflow-hidden rounded-[24px] bg-white shadow-inner"
                          >
                            <div
                              className="absolute left-1/2 top-1"
                              style={{
                                width: MOBILE_BASE_WIDTH,
                                height: mobileDocHeight,
                                transform: `translateX(-50%) scale(${mobileScale})`,
                                transformOrigin: "top center",
                              }}
                            >
                              <iframe
                                key={`mob-${form.theme}-${JSON.stringify(authOptions)}`}
                                ref={mobileIframeRef}
                                onLoad={handleMobileLoad}
                                srcDoc={previewHtml}
                                scrolling="no"
                                className="pointer-events-none block border-0 bg-white"
                                style={{
                                  width: `${MOBILE_BASE_WIDTH}px`,
                                  height: `${mobileDocHeight}px`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="mb-3 mt-3 h-1 w-20 rounded-full bg-slate-200" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <Button variant="outline" onClick={goPrevStep} disabled={isFirstStep} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <span className="text-xs font-medium text-slate-500">
              Etapa {currentStepIndex + 1} de {wizardSteps.length}
            </span>
            <Button onClick={goNextStep} disabled={isLastStep} className="gap-2">
              Proxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadInput({
  onSelect,
  preview,
  name,
  label,
  helper,
}: { onSelect: (file?: File) => void; preview?: string | null; name: string; label: string; helper?: string }) {
  const id = `upload-${name}`;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-medium text-slate-800">
        <span>{label}</span>
        {helper && <span className="text-xs text-slate-500">{helper}</span>}
      </div>
      <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs hover:border-orange-200">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-orange-500" />
          <span>{preview ? "Trocar arquivo" : "Enviar arquivo"}</span>
        </div>
        <input
          id={id}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onSelect(e.target.files?.[0])}
        />
        {preview && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="relative h-9 w-16 overflow-hidden rounded border border-slate-200">
              <Image src={preview} alt="preview" fill className="object-cover" />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-orange-600"
              onClick={(e) => {
                e.preventDefault();
                onSelect(undefined);
              }}
            >
              Remover
            </Button>
          </div>
        )}
      </label>
    </div>
  );
}

function buildAuthTemplate(
  name: string,
  opts: {
    cpf: boolean;
    email: boolean;
    google: boolean;
    facebook: boolean;
    linkedin: boolean;
    tiktok: boolean;
    x: boolean;
    userpass: boolean;
    terms: boolean;
    age: boolean;
  },
  assets: { logo?: string | null; background?: string | null; banner?: string | null } = {},
  theme: "classic" | "modern" = "modern"
) {
  const buttons: { key: keyof typeof opts; label: string; color: string; icon: string; textColor?: string }[] = [
    {
      key: "facebook",
      label: "Facebook",
      color: "#2f4f79",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.25.2 2.25.2v2.45H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>`,
    },
    {
      key: "google",
      label: "Google",
      color: "#4285f4",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><path d="M21.8 12.2c0-.7-.1-1.4-.2-2h-9.6v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.5z" fill="#4285F4"/><path d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H3.1v2.7A10 10 0 0 0 12 22z" fill="#34A853"/><path d="M6.3 13.7A6 6 0 0 1 6 12c0-.6.1-1.2.3-1.7V7.6H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.4l3.2-2.7z" fill="#FBBC05"/><path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.2 2.7c.8-2.5 3.1-4.2 5.7-4.2z" fill="#EA4335"/></svg>`,
      textColor: "#ffffff",
    },
    {
      key: "email",
      label: "E-mail",
      color: "#2d7ff9",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
    },
    {
      key: "cpf",
      label: "CPF",
      color: "#1474e4",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="2" fill="currentColor"/><path d="M13 9h5M13 12h5M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    },
    {
      key: "linkedin",
      label: "LinkedIn",
      color: "#0a66c2",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M6.94 8.5A1.56 1.56 0 1 1 6.94 5.4a1.56 1.56 0 0 1 0 3.12zM5.5 9.75h2.9v8.75H5.5zM10.25 9.75h2.78v1.2h.04c.39-.74 1.33-1.51 2.74-1.51 2.93 0 3.47 1.93 3.47 4.44v4.62h-2.9v-4.1c0-.98-.02-2.24-1.36-2.24-1.36 0-1.57 1.06-1.57 2.17v4.17h-2.9z"/></svg>`,
    },
    {
      key: "tiktok",
      label: "TikTok",
      color: "#111111",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M14.5 3v2.8c0 1.3 1 2.4 2.3 2.5h.7v2.6a5.5 5.5 0 1 1-4.3-5.37V3h1.3zm-2.6 8.9a2.9 2.9 0 1 0 2.6 2.88v-5.8a4.8 4.8 0 0 0 3 .98V8.67a2.4 2.4 0 0 1-2.3-2.5V4.3h-.7v6.02a2.9 2.9 0 0 0-2.6-1.4z"/></svg>`,
    },
    {
      key: "x",
      label: "X",
      color: "#000000",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M18.9 3H21l-6.88 7.86L22 21h-6.15l-4.82-6.32L5.5 21H3.4l7.36-8.42L2 3h6.3l4.36 5.77L18.9 3zm-1.08 16.2h1.17L7.67 4.73H6.4L17.82 19.2z"/></svg>`,
    },
  ];

  const active = buttons.filter((b) => opts[b.key]);
  const checkboxes = [
    opts.terms
      ? `<label class="portal-switch-line"><span class="portal-switch"></span><span>Aceito os termos de uso e políticas de privacidade</span></label>`
      : "",
    opts.age
      ? `<label class="portal-switch-line"><span class="portal-switch"></span><span>Declaro ter mais de 18 anos</span></label>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const bgOverlay = assets.background
    ? `linear-gradient(180deg, rgba(18,42,66,0.35), rgba(18,42,66,0.15)), url('${assets.background}') center/cover`
    : "linear-gradient(180deg, #3ebbe8, #2f9fd6)";

  const banner = assets.banner
    ? `<div style="width:100%;height:64px;overflow:hidden;"><img src="${assets.banner}" alt="banner" style="width:100%;height:100%;object-fit:cover;" /></div>`
    : "";

  if (theme === "classic") {
    return `
    <style>
      .classic-root { min-height: 100vh; background: #edf2f8; display: flex; justify-content: center; padding: 18px; }
      .classic-card { width: 100%; max-width: 390px; background: #fff; border-radius: 18px; overflow: hidden; box-shadow: 0 16px 36px rgba(15,23,42,.16); border: 1px solid #dce6f2; }
      .classic-top { height: 112px; background: ${bgOverlay}; }
      .classic-logo-wrap { width: 116px; height: 116px; margin: -56px auto 0; border-radius: 999px; background: #fff; border: 5px solid #e9f2fa; box-shadow: 0 8px 26px rgba(0,0,0,.12); display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .classic-body { padding: 14px 18px 22px; }
      .classic-title { margin: 8px 0 6px; text-align: center; color: #111827; font-size: 42px; font-weight: 700; line-height: 1; letter-spacing: -0.03em; font-family: "Poppins","Segoe UI",Arial,sans-serif; }
      .classic-subtitle { margin: 0 auto; max-width: 290px; text-align: center; color: #4b5563; font-size: 14px; line-height: 1.45; }
      .classic-register { margin: 16px 0 10px; text-align: center; font-weight: 700; color: #1f2937; font-size: 13px; }
      .classic-buttons { display: flex; flex-direction: column; gap: 8px; }
      .classic-buttons button { border: 0; border-radius: 6px; height: 40px; width: 100%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: 0 8px 18px rgba(15,23,42,.12); padding: 0 16px; }
      .classic-btn-content { display: grid; grid-template-columns: 20px 108px; align-items: center; column-gap: 8px; margin: 0 auto; }
      .classic-icon { width: 20px; height: 20px; border-radius: 4px; background: rgba(255,255,255,.9); color: #1f2937; display: inline-flex; align-items: center; justify-content: center; }
      .classic-btn-label { display: block; text-align: left; white-space: nowrap; }
      .classic-icon svg { width: 14px; height: 14px; display: block; }
      .classic-userpass { margin-top: 10px; border-radius: 10px; background: #101827; color: #fff; padding: 12px; }
      .classic-userpass h3 { margin: 0 0 8px; font-size: 13px; font-weight: 700; }
      .classic-userpass input { width: 100%; height: 38px; border-radius: 6px; border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.12); color: #fff; margin-bottom: 8px; padding: 0 11px; outline: none; }
      .classic-userpass input::placeholder { color: rgba(255,255,255,.72); }
      .classic-userpass button { width: 100%; height: 38px; border: 0; border-radius: 6px; background: #f97316; color: #fff; font-weight: 800; cursor: pointer; }
      .portal-switches { margin-top: 14px; display: flex; flex-direction: column; gap: 9px; }
      .portal-switch-line { display: flex; align-items: center; gap: 10px; color: #4b5563; font-size: 13px; line-height: 1.35; }
      .portal-switch { width: 34px; height: 20px; border-radius: 999px; background: #f59e0b; position: relative; flex-shrink: 0; }
      .portal-switch::after { content: ""; width: 14px; height: 14px; border-radius: 999px; background: #fff; position: absolute; right: 3px; top: 3px; }
      @media (max-width: 640px) {
        .classic-root { padding: 0; }
        .classic-card { max-width: 100%; min-height: 100vh; border-radius: 0; border: 0; box-shadow: none; }
        .classic-title { font-size: 38px; }
      }
    </style>
    <div class="classic-root">
      <div class="classic-card">
        <div class="classic-top"></div>
        <div class="classic-logo-wrap">
          ${
            assets.logo
              ? `<img src="${assets.logo}" alt="logo" style="width:100%;height:100%;object-fit:contain;background:white;" />`
              : `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" aria-hidden="true"><path d="M32 11c-8.7 0-16 7.1-16 16h6c0-5.4 4.5-10 10-10s10 4.6 10 10h6c0-8.9-7.3-16-16-16z" fill="#2f9fd6"/><path d="M21 33c0 6.1 4.9 11 11 11s11-4.9 11-11h-6a5 5 0 0 1-10 0h-6z" fill="#7ecf4e"/></svg>`
          }
        </div>
        <div class="classic-body">
          ${banner}
          <h1 class="classic-title">${name}</h1>
          <p class="classic-subtitle">Faça login em uma rede social para liberar a conexão.</p>
          <div class="classic-register">Registrar-se com:</div>
          <div class="classic-buttons">
            ${active
              .map(
                (b) =>
                  `<button style="background:${b.color};color:${b.textColor || "#ffffff"};">
                    <span class="classic-btn-content">
                      <span class="classic-icon">${b.icon}</span>
                      <span class="classic-btn-label">${b.label}</span>
                    </span>
                  </button>`
              )
              .join("")}
          </div>
          ${
            opts.userpass
              ? `<div class="classic-userpass">
                  <h3>Usuário e senha</h3>
                  <input type="text" placeholder="Digite seu e-mail" />
                  <input type="password" placeholder="Digite sua senha" />
                  <button>LOGIN</button>
                </div>`
              : ""
          }
          ${checkboxes ? `<div class="portal-switches">${checkboxes}</div>` : ""}
        </div>
      </div>
    </div>`;
  }

  return `
  <style>
    .portal-root { min-height: 100vh; background: radial-gradient(circle at 0% 0%, #f0f7fc 0%, #eef2f8 46%, #e8edf4 100%); display: flex; justify-content: center; padding: 18px; }
    .portal-card { width: 100%; max-width: 420px; background: #fff; border-radius: 28px; box-shadow: 0 24px 56px rgba(15, 23, 42, 0.2); overflow: hidden; border: 1px solid #e8eef5; }
    .portal-hero { height: 140px; background: ${bgOverlay}; position: relative; }
    .portal-logo-wrap { width: 112px; height: 112px; border-radius: 999px; background: #ffffff; box-shadow: 0 10px 30px rgba(47, 159, 214, 0.25); border: 6px solid #f2f8fd; margin: -56px auto 0; position: relative; z-index: 2; display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .portal-content { padding: 14px 18px 24px; }
    .portal-title { font-family: "Poppins", "Segoe UI", Arial, sans-serif; font-size: 40px; line-height: 1; font-weight: 700; margin: 0; text-align: center; letter-spacing: -0.02em; color: #1f2937; }
    .portal-subtitle { margin: 8px auto 0; max-width: 280px; text-align: center; color: #4b5563; font-size: 14px; line-height: 1.45; }
    .portal-register { margin: 18px 0 10px; text-align: center; color: #374151; font-weight: 600; font-size: 13px; }
    .portal-buttons { display: flex; flex-direction: column; gap: 8px; }
    .portal-buttons button { border: 0; border-radius: 8px; height: 42px; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: #fff; box-shadow: 0 8px 16px rgba(17, 24, 39, 0.14); padding: 0 16px; }
    .portal-btn-content { display: grid; grid-template-columns: 22px 122px; align-items: center; column-gap: 8px; margin: 0 auto; }
    .portal-icon-pill { width: 22px; height: 22px; border-radius: 999px; background: rgba(255,255,255,0.22); display: inline-flex; align-items: center; justify-content: center; color: #fff; }
    .portal-btn-label { display: block; text-align: left; white-space: nowrap; }
    .portal-icon-pill svg { width: 14px; height: 14px; display: block; }
    .portal-userpass { margin-top: 10px; border-radius: 12px; background: linear-gradient(145deg, #111827, #1f2937); color: #fff; padding: 14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08); }
    .portal-userpass h3 { margin: 0 0 10px; font-size: 14px; font-weight: 700; }
    .portal-userpass input { width: 100%; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.12); color: #fff; margin: 0 0 8px; padding: 0 12px; outline: none; }
    .portal-userpass input::placeholder { color: rgba(255,255,255,0.72); }
    .portal-userpass button { width: 100%; height: 40px; border: 0; border-radius: 8px; background: #ff7a00; color: #fff; font-weight: 800; cursor: pointer; }
    .portal-switches { margin-top: 16px; display: flex; flex-direction: column; gap: 10px; }
    .portal-switch-line { display: flex; align-items: center; gap: 10px; color: #4b5563; font-size: 13px; line-height: 1.35; }
    .portal-switch { width: 34px; height: 20px; border-radius: 999px; background: #f59e0b; position: relative; flex-shrink: 0; }
    .portal-switch::after { content: ""; width: 14px; height: 14px; border-radius: 999px; background: #fff; position: absolute; right: 3px; top: 3px; }
    @media (max-width: 640px) {
      .portal-root { padding: 0; background: #e7edf5; }
      .portal-card { max-width: 100%; min-height: 100vh; border-radius: 0; border: 0; box-shadow: none; }
      .portal-content { padding: 14px 16px 22px; }
      .portal-title { font-size: 36px; }
    }
  </style>
  <div class="portal-root" style="font-family: 'Inter', 'Segoe UI', Arial, sans-serif;">
    <div class="portal-card">
      <div class="portal-hero"></div>
      <div class="portal-logo-wrap">
        ${
          assets.logo
            ? `<img src="${assets.logo}" alt="logo" style="width:100%;height:100%;object-fit:contain;background:white;" />`
            : `<svg viewBox="0 0 64 64" width="64" height="64" fill="none" aria-hidden="true"><path d="M32 11c-8.7 0-16 7.1-16 16h6c0-5.4 4.5-10 10-10s10 4.6 10 10h6c0-8.9-7.3-16-16-16z" fill="#2f9fd6"/><path d="M21 33c0 6.1 4.9 11 11 11s11-4.9 11-11h-6a5 5 0 0 1-10 0h-6z" fill="#7ecf4e"/></svg>`
        }
      </div>
      <div class="portal-content">
        ${banner}
        <h1 class="portal-title">${name}</h1>
        <p class="portal-subtitle">Seja bem-vindo(a)! Faça login em uma rede social para liberar a conexão.</p>
        <div class="portal-register">Registrar-se com:</div>
        <div class="portal-buttons">
          ${active
            .map(
              (b) =>
                `<button style="background:${b.color};color:${b.textColor || "#ffffff"};">
                  <span class="portal-btn-content">
                    <span class="portal-icon-pill">${b.icon}</span>
                    <span class="portal-btn-label">${b.label}</span>
                  </span>
                </button>`
            )
            .join("")}
        </div>
        ${
          opts.userpass
            ? `<div class="portal-userpass">
                <h3>Usuário e senha</h3>
                <input type="text" placeholder="Digite seu e-mail" />
                <input type="password" placeholder="Digite sua senha" />
                <button>LOGIN</button>
              </div>`
            : ""
        }
        ${checkboxes ? `<div class="portal-switches">${checkboxes}</div>` : ""}
      </div>
    </div>
  </div>`;
}
