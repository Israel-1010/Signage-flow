"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MoreVertical, Pencil, Trash2, ListVideo, Clock, ImageIcon, Loader2 } from "lucide-react";

interface PlaylistItem {
  id: string;
  position: number;
  duration: number;
  asset: {
    id: string;
    name: string;
    url: string;
    type: "image" | "video";
  };
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  playlist_items: PlaylistItem[];
}

const fetcher = async () => {
  const response = await fetch("/api/playlists");
  if (!response.ok) throw new Error("Falha ao carregar playlists");
  const data = await response.json();
  return data.playlists as Playlist[];
};

function getTotalDuration(items: PlaylistItem[]): string {
  const totalSeconds = items.reduce((acc, item) => acc + item.duration, 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export default function PlaylistsPage() {
  const { data: playlists, error, isLoading } = useSWR("playlists", fetcher);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [deletingPlaylist, setDeletingPlaylist] = useState<Playlist | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Falha ao criar playlist");

      mutate("playlists");
      setCreateOpen(false);
      setFormData({ name: "", description: "" });
    } catch (err) {
      console.error("Erro ao criar:", err);
      alert("Falha ao criar playlist");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPlaylist || !formData.name.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Falha ao atualizar playlist");

      mutate("playlists");
      setEditingPlaylist(null);
      setFormData({ name: "", description: "" });
    } catch (err) {
      console.error("Erro ao atualizar:", err);
      alert("Falha ao atualizar playlist");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPlaylist) return;

    try {
      const response = await fetch(`/api/playlists/${deletingPlaylist.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao excluir playlist");

      mutate("playlists");
      setDeletingPlaylist(null);
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Falha ao excluir playlist");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Playlists</h1>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie playlists de conteúdo para seus displays
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Criar Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Playlist</DialogTitle>
              <DialogDescription>
                Crie uma nova playlist para organizar seu conteúdo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Minha Playlist"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva esta playlist..."
                  rows={3}
                />
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
            <p className="text-sm text-destructive">Falha ao carregar playlists</p>
          </CardContent>
        </Card>
      ) : playlists?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ListVideo className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma playlist ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie sua primeira playlist para organizar seu conteúdo
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Playlist
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists?.map((playlist) => (
            <Card key={playlist.id} className="group relative overflow-hidden">
              <Link href={`/dashboard/playlists/${playlist.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{playlist.name}</CardTitle>
                      {playlist.description && (
                        <CardDescription className="line-clamp-2">
                          {playlist.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-4 w-4" />
                      {playlist.playlist_items?.length || 0} itens
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {getTotalDuration(playlist.playlist_items || [])}
                    </span>
                  </div>
                  {playlist.playlist_items && playlist.playlist_items.length > 0 && (
                    <div className="mt-4 flex gap-1 overflow-hidden">
                      {playlist.playlist_items
                        .filter((item): item is NonNullable<(typeof playlist.playlist_items)[number]> => item != null)
                        .slice(0, 4)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-muted"
                          >
                            {item.rss_feed_url ? (
                              <div className="h-full w-full flex items-center justify-center bg-red-600">
                                <span className="text-xs text-white font-bold">RSS</span>
                              </div>
                            ) : item.asset && item.asset.type === "image" ? (
                              <img
                                src={item.asset.url || "/placeholder.svg"}
                                alt={item.asset.name}
                                className="h-full w-full object-cover"
                              />
                            ) : item.asset ? (
                              <video
                                src={item.asset.url}
                                className="h-full w-full object-cover"
                                muted
                              />
                            ) : (
                              <div className="h-full w-full bg-muted" />
                            )}
                          </div>
                        ))}
                      {playlist.playlist_items.filter(i => i).length > 4 && (
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded bg-muted text-sm text-muted-foreground">
                          +{playlist.playlist_items.filter(i => i).length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Link>
              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        setEditingPlaylist(playlist);
                        setFormData({
                          name: playlist.name,
                          description: playlist.description || "",
                        });
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeletingPlaylist(playlist);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingPlaylist} onOpenChange={(open) => !open && setEditingPlaylist(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Playlist</DialogTitle>
            <DialogDescription>Atualize os detalhes da playlist</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Minha Playlist"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição (opcional)</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva esta playlist..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPlaylist(null)}>
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
      <AlertDialog open={!!deletingPlaylist} onOpenChange={(open) => !open && setDeletingPlaylist(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Playlist</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingPlaylist?.name}"? Isso também removerá todos os itens da playlist. Esta ação não pode ser desfeita.
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
