import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

type AuthOptions = {
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

type PortalRow = {
  name: string | null;
  html: string | null;
  css: string | null;
  theme?: "classic" | "modern" | null;
  status: "draft" | "published" | null;
  logo_url?: string | null;
  background_url?: string | null;
  banner_url?: string | null;
  auth_options?: AuthOptions | null;
};

function buildAuthTemplate(
  name: string,
  opts: AuthOptions = {},
  assets: { logo?: string | null; background?: string | null; banner?: string | null } = {},
  theme: "classic" | "modern" = "modern"
) {
  const o = {
    cpf: opts.cpf ?? true,
    email: opts.email ?? true,
    google: opts.google ?? true,
    facebook: opts.facebook ?? true,
    linkedin: opts.linkedin ?? true,
    tiktok: opts.tiktok ?? true,
    x: opts.x ?? false,
    terms: opts.terms ?? true,
    age: opts.age ?? true,
    userpass: opts.userpass ?? true,
  };

  const buttons: { enabled: boolean; label: string; color: string; icon: string; textColor?: string }[] = [
    {
      enabled: o.facebook,
      label: "Facebook",
      color: "#2f4f79",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.25.2 2.25.2v2.45H15.2c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/></svg>`,
    },
    {
      enabled: o.google,
      label: "Google",
      color: "#4285f4",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><path d="M21.8 12.2c0-.7-.1-1.4-.2-2h-9.6v3.8h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.5z" fill="#4285F4"/><path d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.6c-.9.6-2 .9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H3.1v2.7A10 10 0 0 0 12 22z" fill="#34A853"/><path d="M6.3 13.7A6 6 0 0 1 6 12c0-.6.1-1.2.3-1.7V7.6H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.4l3.2-2.7z" fill="#FBBC05"/><path d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.2 2.7c.8-2.5 3.1-4.2 5.7-4.2z" fill="#EA4335"/></svg>`,
      textColor: "#ffffff",
    },
    {
      enabled: o.email,
      label: "E-mail",
      color: "#2d7ff9",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2" fill="none"/></svg>`,
    },
    {
      enabled: o.cpf,
      label: "CPF",
      color: "#1474e4",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="10" r="2" fill="currentColor"/><path d="M13 9h5M13 12h5M7 16h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    },
    {
      enabled: o.linkedin,
      label: "LinkedIn",
      color: "#0a66c2",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M6.94 8.5A1.56 1.56 0 1 1 6.94 5.4a1.56 1.56 0 0 1 0 3.12zM5.5 9.75h2.9v8.75H5.5zM10.25 9.75h2.78v1.2h.04c.39-.74 1.33-1.51 2.74-1.51 2.93 0 3.47 1.93 3.47 4.44v4.62h-2.9v-4.1c0-.98-.02-2.24-1.36-2.24-1.36 0-1.57 1.06-1.57 2.17v4.17h-2.9z"/></svg>`,
    },
    {
      enabled: o.tiktok,
      label: "TikTok",
      color: "#111111",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M14.5 3v2.8c0 1.3 1 2.4 2.3 2.5h.7v2.6a5.5 5.5 0 1 1-4.3-5.37V3h1.3zm-2.6 8.9a2.9 2.9 0 1 0 2.6 2.88v-5.8a4.8 4.8 0 0 0 3 .98V8.67a2.4 2.4 0 0 1-2.3-2.5V4.3h-.7v6.02a2.9 2.9 0 0 0-2.6-1.4z"/></svg>`,
    },
    {
      enabled: o.x,
      label: "X",
      color: "#000000",
      icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M18.9 3H21l-6.88 7.86L22 21h-6.15l-4.82-6.32L5.5 21H3.4l7.36-8.42L2 3h6.3l4.36 5.77L18.9 3zm-1.08 16.2h1.17L7.67 4.73H6.4L17.82 19.2z"/></svg>`,
    },
  ];

  const checks = [
    o.terms
      ? `<label class="portal-switch-line"><span class="portal-switch"></span><span>Aceito os termos de uso e políticas de privacidade</span></label>`
      : "",
    o.age
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
            ${buttons
              .filter((b) => b.enabled)
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
            o.userpass
              ? `<div class="classic-userpass">
                  <h3>Usuário e senha</h3>
                  <input type="text" placeholder="Digite seu e-mail" />
                  <input type="password" placeholder="Digite sua senha" />
                  <button>LOGIN</button>
                </div>`
              : ""
          }
          ${checks ? `<div class="portal-switches">${checks}</div>` : ""}
        </div>
      </div>
    </div>
    `;
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
          ${buttons
            .filter((b) => b.enabled)
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
          o.userpass
            ? `<div class="portal-userpass">
                <h3>Usuário e senha</h3>
                <input type="text" placeholder="Digite seu e-mail" />
                <input type="password" placeholder="Digite sua senha" />
                <button>LOGIN</button>
              </div>`
            : ""
        }
        ${checks ? `<div class="portal-switches">${checks}</div>` : ""}
      </div>
    </div>
  </div>
  `;
}

export default async function PortalPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("wifi_portals")
    .select("name, html, css, theme, status, logo_url, background_url, banner_url, auth_options")
    .eq("token", token)
    .maybeSingle<PortalRow>();

  if (error && /theme/i.test(error.message || "")) {
    const fallback = await supabase
      .from("wifi_portals")
      .select("name, html, css, status, logo_url, background_url, banner_url, auth_options")
      .eq("token", token)
      .maybeSingle<PortalRow>();
    data = fallback.data ? { ...fallback.data, theme: "modern" } : fallback.data;
    error = fallback.error;
  }

  if (error || !data || data.status !== "published") {
    return notFound();
  }

  const html =
    data.html && data.html.trim().length > 0
      ? data.html
      : buildAuthTemplate(
          data.name || "Portal Wi-Fi",
          data.auth_options || {},
          {
            logo: data.logo_url,
            background: data.background_url,
            banner: data.banner_url,
          },
          data.theme === "classic" ? "classic" : "modern"
        );
  const css = data.css || "";

  return (
    <div
      className="min-h-screen"
      style={{ background: "#f5f7fb" }}
      dangerouslySetInnerHTML={{ __html: `<style>${css}</style>${html}` }}
    />
  );
}
