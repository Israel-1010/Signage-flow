"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Rss, Plus, Trash2, ExternalLink } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  created_at: string;
}

interface PopularFeed {
  name: string;
  url: string;
  category: string;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch");
  return response.json();
};

export default function RSSFeedsPage() {
  const { data, error, isLoading } = useSWR("/api/rss/feeds", fetcher);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", url: "", category: "news" });
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testFeedUrl, setTestFeedUrl] = useState("");
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const handleAdd = async () => {
    try {
      const response = await fetch("/api/rss/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to add feed");

      mutate("/api/rss/feeds");
      setAddDialogOpen(false);
      setFormData({ name: "", url: "", category: "news" });
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar feed");
    }
  };

  const handleAddPopular = async (feed: PopularFeed) => {
    try {
      const response = await fetch("/api/rss/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feed),
      });

      if (!response.ok) throw new Error("Failed to add feed");

      mutate("/api/rss/feeds");
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar feed");
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      const response = await fetch("/api/rss/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: testFeedUrl }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        setTestResults({ 
          error: data.error || "Falha ao buscar feed",
          success: false 
        });
      } else {
        setTestResults({
          success: true,
          itemCount: data.items?.length || 0,
          items: data.items?.slice(0, 3) || []
        });
      }
    } catch (err: any) {
      setTestResults({ 
        error: err.message || "Erro ao testar feed",
        success: false 
      });
    } finally {
      setTesting(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      news: "Notícias",
      finance: "Finanças",
      tech: "Tecnologia",
      sports: "Esportes",
      weather: "Clima",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      news: "bg-blue-500",
      finance: "bg-green-500",
      tech: "bg-purple-500",
      sports: "bg-orange-500",
      weather: "bg-cyan-500",
    };
    return colors[category] || "bg-gray-500";
  };

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (error) return <div className="p-8">Erro ao carregar feeds</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feeds RSS</h1>
          <p className="text-muted-foreground">Gerencie suas fontes de notícias e informações</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestDialogOpen(true)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Testar Feed
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Feed
          </Button>
        </div>
      </div>

      {/* Feeds Salvos */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Feeds</CardTitle>
          <CardDescription>Feeds RSS que você adicionou</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.feeds?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum feed adicionado ainda</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data?.feeds?.map((feed: RSSFeed) => (
                <Card key={feed.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{feed.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-0.5 text-xs text-white rounded ${getCategoryColor(feed.category)}`}>
                            {getCategoryLabel(feed.category)}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground truncate">{feed.url}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feeds Populares */}
      <Card>
        <CardHeader>
          <CardTitle>Feeds Populares</CardTitle>
          <CardDescription>Adicione feeds pré-configurados de fontes populares</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data?.popular?.map((feed: PopularFeed, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Rss className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{feed.name}</p>
                    <span className={`inline-block px-2 py-0.5 text-xs text-white rounded ${getCategoryColor(feed.category)}`}>
                      {getCategoryLabel(feed.category)}
                    </span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleAddPopular(feed)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Adicionar Feed */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Feed RSS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nome do Feed</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: G1 Notícias"
              />
            </div>
            <div>
              <Label>URL do Feed</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="news">Notícias</SelectItem>
                  <SelectItem value="finance">Finanças</SelectItem>
                  <SelectItem value="tech">Tecnologia</SelectItem>
                  <SelectItem value="sports">Esportes</SelectItem>
                  <SelectItem value="weather">Clima</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Testar Feed */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Testar Feed RSS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                value={testFeedUrl}
                onChange={(e) => setTestFeedUrl(e.target.value)}
                placeholder="URL do feed RSS"
              />
              <Button onClick={handleTest} disabled={testing || !testFeedUrl}>
                {testing ? "Testando..." : "Testar"}
              </Button>
            </div>
            
            {testResults && (
              <div className="space-y-3">
                {testResults.success ? (
                  <>
                    <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                      <p className="text-green-900 font-medium">✓ Feed válido! {testResults.itemCount} itens encontrados</p>
                    </div>
                    <p className="font-medium text-sm">Primeiras notícias:</p>
                    {testResults.items?.map((item: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader>
                          <CardTitle className="text-sm">{item.title}</CardTitle>
                          <CardDescription className="text-xs">{item.pubDate}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <div className="rounded-lg bg-red-50 border border-red-200 p-4 space-y-3">
                    <p className="text-red-900 font-medium">✗ Erro ao carregar feed</p>
                    <p className="text-red-800 text-sm">{testResults.error}</p>
                    <div className="text-xs text-red-700 space-y-1">
                      <p><strong>Sugestões:</strong></p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Verifique se a URL está correta</li>
                        <li>Certifique-se de que é um feed RSS/Atom válido</li>
                        <li>O servidor pode estar bloqueando requisições automatizadas</li>
                        <li>Tente uma das feeds populares abaixo</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
