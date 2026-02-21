"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, ImageIcon, ListVideo, Monitor, Settings, Tv, Palette, Rss, FileText, Wifi, ShieldCheck, Globe2, Router } from "lucide-react"
import type { User } from "@supabase/supabase-js"

interface Profile {
  id: string
  full_name: string | null
  company_name: string | null
  avatar_url: string | null
}

interface DashboardSidebarProps {
  user: User
  profile: Profile | null
}

const navigation = [
  { name: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { name: "Editor", href: "/dashboard/editor", icon: Palette },
  { name: "Mídias", href: "/dashboard/assets", icon: ImageIcon },
  { name: "Playlists", href: "/dashboard/playlists", icon: ListVideo },
  { name: "Players", href: "/dashboard/players", icon: Monitor },
  { name: "Feeds RSS", href: "/dashboard/rss", icon: Rss },
]

const tailNavigation = [
  { name: "Roteador", href: "/dashboard/wifi/roteador", icon: Router },
  { name: "Relatórios", href: "/dashboard/logs", icon: FileText },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
]

const wifiNavigation = [
  { name: "Dashboard", href: "/dashboard/wifi", icon: LayoutDashboard },
  { name: "Acessos", href: "/dashboard/wifi/acessos", icon: ShieldCheck },
  { name: "Portal", href: "/dashboard/wifi/portal", icon: Globe2 },
  { name: "Campanhas", href: "/dashboard/wifi/campanhas", icon: Monitor },
  { name: "Enquete", href: "/dashboard/wifi/enquete", icon: FileText },
]

export function DashboardSidebar({ profile }: DashboardSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white text-slate-900">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <Tv className="h-8 w-8 text-primary" />
        <span className="text-xl font-bold">SignageFlow</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-orange-100 text-slate-900"
                  : "text-slate-600 hover:bg-orange-50 hover:text-slate-900"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}

        <div className="mt-6 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Wifi className="h-4 w-4" />
            Wi‑Fi Marketing
          </div>
          {wifiNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-100 text-slate-900"
                    : "text-slate-600 hover:bg-orange-50 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>

        <div className="mt-6 space-y-1">
          {tailNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-100 text-slate-900"
                    : "text-slate-600 hover:bg-orange-50 hover:text-slate-900"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="text-xs text-sidebar-foreground/50">
          {profile?.company_name || "Sua Empresa"}
        </div>
      </div>
    </aside>
  )
}




