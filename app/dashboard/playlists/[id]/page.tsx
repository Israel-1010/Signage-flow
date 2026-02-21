"use client";

import React from "react";
import { useState, use } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { ArrowLeft, Plus, GripVertical, Clock, Trash2, ImageIcon, Film, Loader2, Calendar, AlertTriangle } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
}

interface PlaylistItem {
  id: string;
  position: number;
  duration: number;
  valid_from: string | null;
  valid_until: string | null;
  asset: Asset | null;
}

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  playlist_items: PlaylistItem[];
}

const playlistFetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Falha ao carregar playlist");
  const data = await response.json();
  return data.playlist as Playlist;
};

const assetsFetcher = async () => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("id, name, url, type")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Asset[];
};

// Helper to check item validity status
function getValidityStatus(validUntil: string | null): "valid" | "expiring" | "expired" {
  if (!validUntil) return "valid";
  
  const now = new Date();
  const endDate = new Date(validUntil);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  
  if (endDate < now) return "expired";
  if (endDate <= twoDaysFromNow) return "expiring";
  return "valid";
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export default function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: playlist, error, isLoading } = useSWR(`/api/playlists/${id}`, playlistFetcher);
  const { data: assets } = useSWR("assets-for-playlist", assetsFetcher);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string>("");
  const [duration, setDuration] = useState("10");
  const [validFrom, setValidFrom] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingItem, setDeletingItem] = useState<PlaylistItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<PlaylistItem | null>(null);
  const [editingItem, setEditingItem] = useState<PlaylistItem | null>(null);
  const [editValidFrom, setEditValidFrom] = useState<string>("");
  const [editValidUntil, setEditValidUntil] = useState<string>("");

  const handleAddItem = async () => {
    if (!selectedAsset) return;

    setSubmitting(true);
    try {
      const body = {
        asset_id: selectedAsset,
        duration: Number.parseInt(duration) || 10,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
      };

      console.log("[v0] Sending request body:", body);
      
      const response = await fetch(`/api/playlists/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        console.error("[v0] API Error Response:", errorData);
        throw new Error(errorData.error || "Falha ao adicionar item");
      }

      mutate(`/api/playlists/${id}`);
      setAddOpen(false);
      setSelectedAsset("");
      setSelectedRssFeed("");
      setRssUrl("");
      setRssSource("saved");
      setDuration("10");
      setValidFrom("");
      setValidUntil("");
    } catch (err) {
      console.error("Erro ao adicionar:", err);
      alert("Falha ao adicionar item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;

    try {
      const response = await fetch(`/api/playlists/${id}/items/${deletingItem.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Falha ao remover item");

      mutate(`/api/playlists/${id}`);
      setDeletingItem(null);
    } catch (err) {
      console.error("Erro ao remover:", err);
      alert("Falha ao remover item");
    }
  };

  const handleUpdateItem = async (itemId: string, updates: { duration?: number; valid_from?: string | null; valid_until?: string | null }) => {
    try {
      const response = await fetch(`/api/playlists/${id}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error("Falha ao atualizar");

      mutate(`/api/playlists/${id}`);
    } catch (err) {
      console.error("Erro ao atualizar:", err);
    }
  };

  const handleEditSchedule = (item: PlaylistItem) => {
    setEditingItem(item);
    setEditValidFrom(item.valid_from || "");
    setEditValidUntil(item.valid_until || "");
  };

  const handleSaveSchedule = async () => {
    if (!editingItem) return;
    
    await handleUpdateItem(editingItem.id, {
      valid_from: editValidFrom || null,
      valid_until: editValidUntil || null,
    });
    
    setEditingItem(null);
    setEditValidFrom("");
    setEditValidUntil("");
  };

  const handleDragStart = (item: PlaylistItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: PlaylistItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;
  };

  const handleDrop = async (targetItem: PlaylistItem) => {
    if (!draggedItem || !playlist || draggedItem.id === targetItem.id) return;

    const items = [...playlist.playlist_items];
    const draggedIndex = items.findIndex((i) => i.id === draggedItem.id);
    const targetIndex = items.findIndex((i) => i.id === targetItem.id);

    items.splice(draggedIndex, 1);
    items.splice(targetIndex, 0, draggedItem);

    const updatedItems = items.map((item, index) => ({
      id: item.id,
      position: index,
      duration: item.duration,
    }));

    try {
      const response = await fetch(`/api/playlists/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updatedItems }),
      });

      if (!response.ok) throw new Error("Falha ao reordenar");

      mutate(`/api/playlists/${id}`);
    } catch (err) {
      console.error("Erro ao reordenar:", err);
    }

    setDraggedItem(null);
  };

  const getTotalDuration = (): string => {
    if (!playlist?.playlist_items) return "0s";
    const totalSeconds = playlist.playlist_items.reduce((acc, item) => acc + item.duration, 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getValidityBadge = (item: PlaylistItem) => {
    const status = getValidityStatus(item.valid_until);
    
    if (status === "expired") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Expirado
        </Badge>
      );
    }
    
    if (status === "expiring") {
      return (
        <Badge className="gap-1 bg-orange-500 hover:bg-orange-600">
          <AlertTriangle className="h-3 w-3" />
          Expira em breve
        </Badge>
      );
    }
    
    if (item.valid_from || item.valid_until) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Calendar className="h-3 w-3" />
          Agendado
        </Badge>
      );
    }
    
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/playlists">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Playlists
          </Button>
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive">Falha ao carregar playlist</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/playlists">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{playlist.name}</h1>
          {playlist.description && (
            <p className="text-sm text-muted-foreground">{playlist.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Total: {getTotalDuration()}
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Mídia
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Adicionar Conteúdo à Playlist</DialogTitle>
              <DialogDescription>RSS agora é configurado direto no Player. Adicione somente mídias aqui.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mídia</Label>
                <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma mídia" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets?.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex items-center gap-2">
                          {asset.type === "video" ? (
                            <Film className="h-4 w-4" />
                          ) : (
                            <ImageIcon className="h-4 w-4" />
                          )}
                          {asset.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duração (segundos)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="300"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validFrom">Data Início</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validUntil">Data Fim</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                O Feed RSS é configurado na página de Players. Aqui você adiciona apenas mídias.
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleAddItem} 
                disabled={submitting || !selectedAsset}
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {playlist.playlist_items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma mídia nesta playlist</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Adicione mídias para criar sua sequência de exibição
            </p>
            <Button className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Mídia
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {playlist.playlist_items.map((item, index) => {
              const status = getValidityStatus(item.valid_until);
              const isExpired = status === "expired";
              const isExpiring = status === "expiring";
              
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDrop={() => handleDrop(item)}
                  className={`flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 ${
                    draggedItem?.id === item.id ? "opacity-50" : ""
                  } ${isExpired ? "bg-red-500/10 border-l-4 border-l-red-500" : ""} ${
                    isExpiring ? "bg-orange-500/10 border-l-4 border-l-orange-500" : ""
                  }`}
                >
                  <div className="cursor-grab text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-muted flex items-center justify-center">
                    {item.asset?.type === "image" ? (
                      <img
                        src={item.asset.url || "/placeholder.svg"}
                        alt={item.asset.name}
                        className="h-full w-full object-cover"
                      />
                    ) : item.asset?.type === "video" ? (
                      <video
                        src={item.asset?.url}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate font-medium ${isExpired ? "text-red-400" : ""}`}>
                      {item.asset?.name || "Conteúdo"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        {item.asset?.type === "video" ? (
                          <>
                            <Film className="h-3 w-3" />
                            vídeo
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3 w-3" />
                            imagem
                          </>
                        )}
                      </span>
                      {getValidityBadge(item)}
                    </div>
                    {(item.valid_from || item.valid_until) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.valid_from ? `De ${formatDate(item.valid_from)}` : ""} 
                        {item.valid_from && item.valid_until ? " " : ""}
                        {item.valid_until ? `Até ${formatDate(item.valid_until)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="1"
                      max="300"
                      value={item.duration}
                      onChange={(e) =>
                        handleUpdateItem(item.id, { duration: Number.parseInt(e.target.value) || 10 })
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">seg</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditSchedule(item)}
                    title="Editar agendamento"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingItem(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Edit Schedule Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>
              Configure as datas de exibição para "{editingItem?.asset?.name || "item"}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editValidFrom">Data Início</Label>
                <Input
                  id="editValidFrom"
                  type="date"
                  value={editValidFrom}
                  onChange={(e) => setEditValidFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editValidUntil">Data Fim</Label>
                <Input
                  id="editValidUntil"
                  type="date"
                  value={editValidUntil}
                  onChange={(e) => setEditValidUntil(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Deixe em branco para exibir sempre. 2 dias antes de vencer ficará laranja. Após vencer ficará vermelho e não será mais exibido.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingItem} onOpenChange={(open) => !open && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deletingItem?.asset?.name || "item"}" desta playlist?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
