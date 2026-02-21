"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientHero } from "@/components/gradient-hero";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Users, Radio, Repeat, CircleUserRound } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const daily = [
  { dia: "01", valor: 8 },
  { dia: "02", valor: 22 },
  { dia: "03", valor: 15 },
  { dia: "04", valor: 12 },
  { dia: "05", valor: 18 },
  { dia: "06", valor: 14 },
  { dia: "07", valor: 13 },
  { dia: "08", valor: 21 },
  { dia: "09", valor: 19 },
  { dia: "10", valor: 17 },
];

const deviceShare = [
  { name: "Mobile", value: 620 },
  { name: "PC", value: 293 },
];

const osShare = [
  { name: "Android", value: 480 },
  { name: "iOS", value: 310 },
  { name: "Windows", value: 123 },
];

const visitsHour = Array.from({ length: 24 }, (_, i) => ({ hora: `${i}h`, valor: Math.round(Math.random() * 70) + 10 }));

const COLORS = ["#ff5a6a", "#ff8fa1", "#ffc7d0", "#5a67ff", "#8ab4ff"];

export default function WifiDashboard() {
  return (
    <div className="space-y-6">
      <GradientHero
        title="Dashboard"
        subtitle="Wi-Fi Marketing"
        actions={
          <div className="flex items-center gap-2">
            <Select defaultValue="30d">
              <SelectTrigger className="w-36 bg-white/10 text-white border-white/30">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" className="bg-white text-rose-600 hover:bg-rose-50">Filtrar</Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="visitors">Visitantes</TabsTrigger>
          <TabsTrigger value="rede">Rede</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Visitantes Online" value="18" icon={<Radio className="h-5 w-5 text-rose-500" />} />
            <StatCard title="Visitantes Cadastrados" value="255" icon={<Users className="h-5 w-5 text-rose-500" />} />
            <StatCard title="Visitantes Únicos" value="3" helper="Últimos 30 dias" icon={<CircleUserRound className="h-5 w-5 text-rose-500" />} />
            <StatCard title="Visitantes Recorrentes" value="8" helper="Últimos 30 dias" icon={<Repeat className="h-5 w-5 text-rose-500" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Cadastros por dia</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily}>
                    <XAxis dataKey="dia" stroke="#94a3b8" />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#ff6b7a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Origem dos cadastros</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: "Formulário", value: 255 }]} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} fill="#ff6b7a" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Tipo de dispositivo</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceShare} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>
                      {deviceShare.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sistema operacional</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={osShare} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>
                      {osShare.map((_, i) => (
                        <Cell key={i} fill={COLORS[i]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-1 col-span-3">
              <CardHeader>
                <CardTitle>Média por hora</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitsHour}>
                    <XAxis dataKey="hora" stroke="#94a3b8" hide />
                    <Tooltip />
                    <Bar dataKey="valor" fill="#ff6b7a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, helper, icon }: { title: string; value: string; helper?: string; icon: React.ReactNode }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          {icon}
        </div>
        <div>
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500">{title}</div>
          {helper && <div className="text-xs text-slate-400">{helper}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
