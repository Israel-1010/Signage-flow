"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Monitor, MoreVertical, Pencil, Trash2, MapPin, Link2, Loader2, Copy, ExternalLink, Unlock, Rss } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Asset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

interface Playlist {
  id: string;
  name: string;
  playlist_items?: {
    position: number;
    asset?: Asset | null;
  }[];
}

interface Player {
  id: string;
  name: string;
  location: string | null;
  code: string;
  status: "online" | "offline";
  last_ping: string | null;
  default_playlist_id: string | null;
  current_playlist: Playlist | null;
  resolution: string;
  orientation: string;
  created_at: string;
  rss_enabled?: boolean;
  rss_feed_url?: string | null;
  rss_display_type?: "ticker" | "card" | "fullscreen" | null;
  rss_update_interval?: number | null;
  rss_slot_duration?: number | null;
  rss_slot_every?: number | null;
}

const RESOLUTIONS = [
  { value: "1920x1080", label: "Full HD (1920x1080)" },
  { value: "1280x720", label: "HD (1280x720)" },
  { value: "3840x2160", label: "4K (3840x2160)" },
  { value: "1080x1920", label: "Full HD Vertical (1080x1920)" },
  { value: "720x1280", label: "HD Vertical (720x1280)" },
  { value: "1024x768", label: "XGA (1024x768)" },
  { value: "800x600", label: "SVGA (800x600)" },
];

const ORIENTATIONS = [
  { value: "landscape", label: "Horizontal (Paisagem)" },
  { value: "portrait", label: "Vertical (Retrato)" },
];

const playersFetcher = async () => {
  const response = await fetch("/api/players");
  if (!response.ok) throw new Error("Falha ao carregar players");
  const data = await response.json();
  return data.players as Player[];
};

const activeItems = (
  items?: {
    position: number;
    asset?: Asset | null;
    valid_from?: string | null;
    valid_until?: string | null;
  }[]
) => {
  if (!items) return [];
  const todayStr = new Date().toISOString().split("T")[0];
  return items.filter((item) => {
    const fromOk = !item.valid_from || item.valid_from <= todayStr;
    const untilOk = !item.valid_until || item.valid_until >= todayStr;
    return fromOk && untilOk;
  });
};

const playlistsFetcher = async () => {
  const response = await fetch("/api/playlists");
  if (!response.ok) throw new Error("Falha ao carregar playlists");
  const data = await response.json();
  return data.playlists as Playlist[];
};

const rssFeedsFetcher = async () => {
  const response = await fetch("/api/rss/feeds");
  if (!response.ok) throw new Error("Falha ao carregar feeds RSS");
  const data = await response.json();
  return data.feeds as { id: string; name: string; url: string }[];
};

export default function PlayersPage() {
  const { data: players, error, isLoading } = useSWR("players", playersFetcher);
  const { data: playlists } = useSWR("playlists-for-players", playlistsFetcher);
  const { data: rssFeeds } = useSWR("rss-feeds-for-players", rssFeedsFetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [deletingPlayer, setDeletingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({ name: "", location: "" });
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("none");
  const [selectedResolution, setSelectedResolution] = useState<string>("1920x1080");
  const [selectedOrientation, setSelectedOrientation] = useState<string>("landscape");
  const [submitting, setSubmitting] = useState(false);
  const [rssEnabled, setRssEnabled] = useState(false);
  const [rssMode, setRssMode] = useState<"saved" | "custom">("saved");
  const [selectedRssFeed, setSelectedRssFeed] = useState<string>("");
  const [rssUrl, setRssUrl] = useState("");
  const [rssDisplayType, setRssDisplayType] = useState<"ticker" | "card" | "fullscreen">("card");
  const [rssUpdateInterval, setRssUpdateInterval] = useState("300");
  const [rssSlotDuration, setRssSlotDuration] = useState("10");
  const [rssSlotEvery, setRssSlotEvery] = useState("2");

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const actualRssUrl =
        rssMode === "saved"
          ? rssFeeds?.find((f) => f.id === selectedRssFeed)?.url || null
          : rssUrl || null;

      const response = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          resolution: selectedResolution,
          orientation: selectedOrientation,
          rss_enabled: rssEnabled && !!actualRssUrl,
          rss_feed_url: rssEnabled ? actualRssUrl : null,
          rss_display_type: rssDisplayType,
          rss_update_interval: Number.parseInt(rssUpdateInterval) || 300,
          rss_slot_duration: Number.parseInt(rssSlotDuration) || 10,
          rss_slot_every: Number.parseInt(rssSlotEvery) || 2,
        }),
      });

      if (!response.ok) throw new Error("Falha ao criar player");

      mutate("players");
      setCreateOpen(false);
      setFormData({ name: "", location: "" });
      setSelectedResolution("1920x1080");
      setSelectedOrientation("landscape");
      setRssEnabled(false);
      setRssUrl("");
      setSelectedRssFeed("");
      setRssMode("saved");
      setRssDisplayType("card");
      setRssUpdateInterval("300");
      setRssSlotDuration("10");
      setRssSlotEvery("2");
    } catch (err) {
      console.error("Erro ao criar:", err);
      alert("Falha ao criar player");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPlayer || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      const actualRssUrl =
        rssMode === "saved"
          ? rssFeeds?.find((f) => f.id === selectedRssFeed)?.url || null
          : rssUrl || null;

      const response = await fetch(`/api/players/${editingPlayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          default_playlist_id: selectedPlaylist === "none" ? null : selectedPlaylist,
          resolution: selectedResolution,
          orientation: selectedOrientation,
          rss_enabled: rssEnabled && !!actualRssUrl,
          rss_feed_url: rssEnabled ? actualRssUrl : null,
          rss_display_type: rssDisplayType,
          rss_update_interval: Number.parseInt(rssUpdateInterval) || 300,
          rss_slot_duration: Number.parseInt(rssSlotDuration) || 10,
          rss_slot_every: Number.parseInt(rssSlotEvery) || 2,
        }),
      });

      if (!response.ok) throw new Error("Falha ao atualizar player");

      mutate("players");
      setEditingPlayer(null);
      setFormData({ name: "", location: "" });
      setSelectedPlaylist("none");
      setSelectedResolution("1920x1080");
      setSelectedOrientation("landscape");
      setRssEnabled(false);
      setRssUrl("");
      setSelectedRssFeed("");
      setRssMode("saved");
      setRssDisplayType("card");
      setRssUpdateInterval("300");
      setRssSlotDuration("10");
      setRssSlotEvery("2");
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      alert("Falha ao atualizar player");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlayer) return;

    try {
      const response = await fetch(`/api/players/${deletingPlayer.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao excluir player");

      mutate("players");
      setDeletingPlayer(null);
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Falha ao excluir player");
    }
  };

  const copyPairingCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const handleUnlockDevice = async (playerId: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlock_device: true }),
      });

      if (!response.ok) throw new Error("Falha ao desbloquear");

      mutate("players");
      alert("Dispositivo desbloqueado! Agora você pode usar o player em outro dispositivo.");
    } catch (err) {
      console.error("Erro ao desbloquear:", err);
      alert("Falha ao desbloquear dispositivo");
    }
  };

  const getDisplayUrl = (playerId: string) => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/display/${playerId}`;
    }
    return `/display/${playerId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Players</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus dispositivos de exibição
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Player
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Player</DialogTitle>
              <DialogDescription>
                Crie um novo player para conectar a um dispositivo de exibição
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="TV Recepção"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localização (opcional)</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Entrada Principal"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Resolução</Label>
                  <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLUTIONS.map((res) => (
                        <SelectItem key={res.value} value={res.value}>
                          {res.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientação</Label>
                  <Select value={selectedOrientation} onValueChange={setSelectedOrientation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIENTATIONS.map((ori) => (
                        <SelectItem key={ori.value} value={ori.value}>
                          {ori.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>RSS no player</Label>
                    <p className="text-xs text-muted-foreground">Inserir feed entre as mídias</p>
                  </div>
                  <Switch checked={rssEnabled} onCheckedChange={setRssEnabled} />
                </div>
                {rssEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Origem do feed</Label>
                      <Select value={rssMode} onValueChange={(v) => setRssMode(v as "saved" | "custom")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saved">Lista de feeds</SelectItem>
                          <SelectItem value="custom">URL customizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {rssMode === "saved" ? (
                      <div className="space-y-1">
                        <Label>Feed salvo</Label>
                        <Select value={selectedRssFeed} onValueChange={setSelectedRssFeed}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um feed" />
                          </SelectTrigger>
                          <SelectContent>
                            {rssFeeds?.map((feed) => (
                              <SelectItem key={feed.id} value={feed.id}>
                                {feed.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label>URL do Feed</Label>
                        <Input
                          placeholder="https://exemplo.com/rss"
                          value={rssUrl}
                          onChange={(e) => setRssUrl(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <Label>Layout</Label>
                        <Select value={rssDisplayType} onValueChange={(v) => setRssDisplayType(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="card">Cards</SelectItem>
                            <SelectItem value="fullscreen">Tela cheia</SelectItem>
                            <SelectItem value="ticker">Ticker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Atualizar (s)</Label>
                        <Input
                          type="number"
                          min={60}
                          value={rssUpdateInterval}
                          onChange={(e) => setRssUpdateInterval(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <Label>Duração do slot (s)</Label>
                        <Input
                          type="number"
                          min={5}
                          value={rssSlotDuration}
                          onChange={(e) => setRssSlotDuration(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Inserir a cada (itens)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rssSlotEvery}
                          onChange={(e) => setRssSlotEvery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={submitting || !formData.name.trim()}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive">Falha ao carregar players</p>
          </CardContent>
        </Card>
      ) : players?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Monitor className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhum player ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione seu primeiro player para começar a exibir conteúdo
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Player
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {players?.map((player) => {
            const statusColor = player.status === "online" ? "bg-emerald-500" : "bg-gray-400";
            const validItems = activeItems(player.current_playlist?.playlist_items);
            const thumb =
              validItems
                ?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                ?.find((item) => item.asset?.type === "image" && item.asset?.url)?.asset?.url ||
              player.current_playlist?.playlist_items
                ?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                ?.find((item) => item.asset?.type === "image" && item.asset?.url)?.asset?.url;
            return (
              <Card
                key={player.id}
                className="relative overflow-hidden rounded-lg bg-card text-foreground shadow-md ring-1 ring-border"
              >
                {/* Simula uma tela de player */}
                <div className="aspect-[3/2] w-full border-b border-border/60 relative overflow-hidden">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <div className="absolute inset-0 bg-muted" />
                  )}
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 rounded-md bg-black/55 px-2 py-1 text-white shadow-sm backdrop-blur">
                        <span className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
                        <span className="uppercase tracking-wide">{player.status}</span>
                      </div>
                      {player.current_playlist && (
                        <span className="flex items-center gap-1 rounded-md bg-black/45 px-2 py-1 text-[11px] text-white shadow-sm backdrop-blur">
                          <Link2 className="h-3 w-3" />
                          {player.current_playlist.name}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-800">
                      <span className="rounded-md bg-white/85 px-2 py-1 shadow-sm backdrop-blur">
                        {player.resolution || "1920x1080"}
                      </span>
                      <span className="rounded-md bg-white/85 px-2 py-1 shadow-sm backdrop-blur">
                        {player.orientation === "portrait" ? "Vertical" : "Horizontal"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 space-y-2 relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold">{player.name}</div>
                      {player.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {player.location}
                        </div>
                      )}
                      <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                        Código: <span className="font-mono">{player.code}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyPairingCode(player.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingPlayer(player);
                            setFormData({
                              name: player.name,
                              location: player.location || "",
                            });
                            setSelectedPlaylist(player.default_playlist_id || "none");
                            setSelectedResolution(player.resolution || "1920x1080");
                            setSelectedOrientation(player.orientation || "landscape");
                            setRssEnabled(!!player.rss_enabled);
                            setRssDisplayType((player.rss_display_type as any) || "card");
                            setRssUpdateInterval(String(player.rss_update_interval ?? 300));
                            setRssSlotDuration(String(player.rss_slot_duration ?? 10));
                            setRssSlotEvery(String(player.rss_slot_every ?? 2));
                            if (player.rss_feed_url) {
                              const found = rssFeeds?.find((f) => f.url === player.rss_feed_url);
                              if (found) {
                                setRssMode("saved");
                                setSelectedRssFeed(found.id);
                                setRssUrl("");
                              } else {
                                setRssMode("custom");
                                setRssUrl(player.rss_feed_url);
                                setSelectedRssFeed("");
                              }
                            } else {
                              setRssMode("saved");
                              setSelectedRssFeed("");
                              setRssUrl("");
                            }
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a href={getDisplayUrl(player.id)} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir Display
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUnlockDevice(player.id)}>
                          <Unlock className="mr-2 h-4 w-4" />
                          Desbloquear Dispositivo
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingPlayer(player)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                <div className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-white">
                    <Rss className="h-4 w-4" />
                    RSS no player
                  </span>
                    <Badge variant={player.rss_enabled ? "default" : "secondary"}>
                      {player.rss_enabled ? "Ativo" : "Desligado"}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPlayer} onOpenChange={(open) => !open && setEditingPlayer(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Player</DialogTitle>
            <DialogDescription>Atualize as configurações do player</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="TV Recepção"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Localização (opcional)</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Entrada Principal"
              />
            </div>
            <div className="space-y-2">
              <Label>Playlist</Label>
              <Select value={selectedPlaylist} onValueChange={setSelectedPlaylist}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma playlist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma playlist</SelectItem>
                  {playlists?.map((playlist) => (
                    <SelectItem key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Resolução</Label>
                <Select value={selectedResolution} onValueChange={setSelectedResolution}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESOLUTIONS.map((res) => (
                      <SelectItem key={res.value} value={res.value}>
                        {res.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Orientação</Label>
                <Select value={selectedOrientation} onValueChange={setSelectedOrientation}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIENTATIONS.map((ori) => (
                      <SelectItem key={ori.value} value={ori.value}>
                        {ori.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                </div>
              </div>
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>RSS no player</Label>
                    <p className="text-xs text-muted-foreground">Inserir feed entre as mídias</p>
                  </div>
                  <Switch checked={rssEnabled} onCheckedChange={setRssEnabled} />
                </div>
                {rssEnabled && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Origem do feed</Label>
                      <Select value={rssMode} onValueChange={(v) => setRssMode(v as "saved" | "custom")}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saved">Lista de feeds</SelectItem>
                          <SelectItem value="custom">URL customizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {rssMode === "saved" ? (
                      <div className="space-y-1">
                        <Label>Feed salvo</Label>
                        <Select value={selectedRssFeed} onValueChange={setSelectedRssFeed}>
                          <SelectTrigger>
                            <SelectValue placeholder="Escolha um feed" />
                          </SelectTrigger>
                          <SelectContent>
                            {rssFeeds?.map((feed) => (
                              <SelectItem key={feed.id} value={feed.id}>
                                {feed.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Label>URL do Feed</Label>
                        <Input
                          placeholder="https://exemplo.com/rss"
                          value={rssUrl}
                          onChange={(e) => setRssUrl(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <Label>Layout</Label>
                        <Select value={rssDisplayType} onValueChange={(v) => setRssDisplayType(v as any)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="card">Cards</SelectItem>
                            <SelectItem value="fullscreen">Tela cheia</SelectItem>
                            <SelectItem value="ticker">Ticker</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Atualizar (s)</Label>
                        <Input
                          type="number"
                          min={60}
                          value={rssUpdateInterval}
                          onChange={(e) => setRssUpdateInterval(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <Label>Duração do slot (s)</Label>
                        <Input
                          type="number"
                          min={5}
                          value={rssSlotDuration}
                          onChange={(e) => setRssSlotDuration(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Inserir a cada (itens)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rssSlotEvery}
                          onChange={(e) => setRssSlotEvery(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlayer(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={submitting || !formData.name.trim()}>
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPlayer} onOpenChange={(open) => !open && setDeletingPlayer(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Player</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingPlayer?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
