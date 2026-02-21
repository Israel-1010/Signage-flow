import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GradientHero } from "@/components/gradient-hero";
import { ImageIcon, ListVideo, Monitor, Activity, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { count: assetsCount },
    { count: playlistsCount },
    { count: playersCount },
    { data: recentPlayers },
  ] = await Promise.all([
    supabase.from("assets").select("*", { count: "exact", head: true }),
    supabase.from("playlists").select("*", { count: "exact", head: true }),
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase
      .from("players")
      .select("*")
      .order("last_ping", { ascending: false })
      .limit(5),
  ]);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: onlinePlayersCount } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .gte("last_ping", fiveMinutesAgo);

  const stats = [
    {
      name: "Total de Mídias",
      value: assetsCount || 0,
      icon: ImageIcon,
      href: "/dashboard/assets",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "Playlists",
      value: playlistsCount || 0,
      icon: ListVideo,
      href: "/dashboard/playlists",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      name: "Players",
      value: playersCount || 0,
      icon: Monitor,
      href: "/dashboard/players",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <GradientHero title="Dashboard" subtitle="SignageFlow" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.name} href={stat.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.name}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              Status dos Players
            </CardTitle>
            <CardDescription>
              {onlinePlayersCount || 0} de {playersCount || 0} players online
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentPlayers && recentPlayers.length > 0 ? (
              <div className="space-y-3">
                {recentPlayers.map((player: any) => {
                  const isOnline =
                    player.last_ping && new Date(player.last_ping) > new Date(Date.now() - 5 * 60 * 1000);
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${
                            isOnline ? "bg-emerald-500" : "bg-muted-foreground/30"
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium">{player.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {player.location || "Sem localização"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isOnline ? "text-emerald-500" : "text-muted-foreground"
                        }`}
                      >
                        {isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Monitor className="h-12 w-12 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum player cadastrado
                </p>
                <Link
                  href="/dashboard/players"
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Adicionar seu primeiro player
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {(assetsCount === 0 || playersCount === 0) && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Primeiros Passos
              </CardTitle>
              <CardDescription>
                Siga estas etapas para configurar sua rede de sinalização digital
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      (assetsCount ?? 0) > 0 ? "bg-emerald-500 text-emerald-50" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    1
                  </span>
                  <div>
                    <p className="font-medium">Envie seu conteúdo</p>
                    <p className="text-muted-foreground">Adicione imagens e vídeos à sua biblioteca de mídias</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      (playlistsCount ?? 0) > 0 ? "bg-emerald-500 text-emerald-50" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    2
                  </span>
                  <div>
                    <p className="font-medium">Crie playlists</p>
                    <p className="text-muted-foreground">Organize seu conteúdo em playlists com tempo de exibição</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      (playersCount ?? 0) > 0 ? "bg-emerald-500 text-emerald-50" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    3
                  </span>
                  <div>
                    <p className="font-medium">Cadastre players</p>
                    <p className="text-muted-foreground">Adicione seus dispositivos de exibição à rede</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    4
                  </span>
                  <div>
                    <p className="font-medium">Atribua playlists</p>
                    <p className="text-muted-foreground">Vincule playlists aos players para começar a exibir</p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
