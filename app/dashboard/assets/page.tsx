"use client";

import React from "react";
import { useState, useCallback } from "react";
import useSWR, { mutate } from "swr";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Upload, ImageIcon, Film, MoreVertical, Pencil, Trash2, Search, Grid, List, Loader2 } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  url: string;
  type: "image" | "video";
  file_size: number;
  created_at: string;
}

const fetcher = async () => {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Asset[];
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export default function AssetsPage() {
  const { data: assets, error, isLoading } = useSWR("assets", fetcher);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<Asset | null>(null);
  const [newName, setNewName] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name);

        const response = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Falha no upload");
        }
      }
      mutate("assets");
      setUploadOpen(false);
    } catch (err) {
      console.error("Erro no upload:", err);
      alert(err instanceof Error ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
      setDragActive(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleUpload(e.dataTransfer.files);
  }, []);

  const handleDelete = async () => {
    if (!deletingAsset) return;

    try {
      const response = await fetch(`/api/assets/${deletingAsset.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir mídia");
      }

      mutate("assets");
      setDeletingAsset(null);
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Falha ao excluir mídia");
    }
  };

  const handleRename = async () => {
    if (!editingAsset || !newName.trim()) return;

    try {
      const response = await fetch(`/api/assets/${editingAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error("Falha ao renomear mídia");
      }

      mutate("assets");
      setEditingAsset(null);
      setNewName("");
    } catch (err) {
      console.error("Erro ao renomear:", err);
      alert("Falha ao renomear mídia");
    }
  };

  const filteredAssets = assets?.filter((asset) =>
    asset.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mídias</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie sua biblioteca de mídia - imagens e vídeos para seus displays
          </p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Enviar Mídia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Mídias</DialogTitle>
              <DialogDescription>
                Envie imagens ou vídeos para sua biblioteca de mídia
              </DialogDescription>
            </DialogHeader>
            <div
              className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Enviando...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Arraste e solte arquivos aqui, ou clique para selecionar
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => handleUpload(e.target.files)}
                  />
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos suportados: JPG, PNG, GIF, WebP, MP4, WebM
            </p>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar mídias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border p-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive">Falha ao carregar mídias</p>
          </CardContent>
        </Card>
      ) : filteredAssets?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">Nenhuma mídia ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Envie sua primeira mídia para começar
            </p>
            <Button className="mt-4" onClick={() => setUploadOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Enviar Mídia
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredAssets?.map((asset) => (
            <Card key={asset.id} className="group overflow-hidden">
              <div className="relative aspect-video bg-muted">
                {asset.type === "image" ? (
                  <img
                    src={asset.url || "/placeholder.svg"}
                    alt={asset.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={asset.url}
                    className="h-full w-full object-cover"
                    muted
                  />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="absolute right-2 top-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingAsset(asset);
                            setNewName(asset.name);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingAsset(asset)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="absolute bottom-2 left-2">
                  {asset.type === "video" ? (
                    <span className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      <Film className="h-3 w-3" />
                      Vídeo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
                      <ImageIcon className="h-3 w-3" />
                      Imagem
                    </span>
                  )}
                </div>
              </div>
              <CardContent className="p-3">
                <p className="truncate text-sm font-medium">{asset.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(asset.file_size)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-border">
            {filteredAssets?.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-4 p-4 hover:bg-muted/50"
              >
                <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded bg-muted">
                  {asset.type === "image" ? (
                    <img
                      src={asset.url || "/placeholder.svg"}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={asset.url}
                      className="h-full w-full object-cover"
                      muted
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{asset.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {asset.type === "video" ? "Vídeo" : "Imagem"} •{" "}
                    {formatFileSize(asset.file_size)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingAsset(asset);
                        setNewName(asset.name);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Renomear
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeletingAsset(asset)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!editingAsset} onOpenChange={(open) => !open && setEditingAsset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Mídia</DialogTitle>
            <DialogDescription>Digite um novo nome para esta mídia</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nome da mídia"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAsset(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAsset} onOpenChange={(open) => !open && setDeletingAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Mídia</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deletingAsset?.name}"? Esta ação não pode ser desfeita.
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
