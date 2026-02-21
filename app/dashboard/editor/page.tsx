"use client";

import React from "react"

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Type,
  Square,
  Circle,
  ImageIcon,
  Download,
  Trash2,
  Upload,
  Video,
  Palette,
  Copy,
  Move,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Minus,
  Triangle,
  Star,
  MoveRight,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";

interface CanvasElement {
  id: string;
  type: "text" | "rectangle" | "circle" | "image" | "video" | "line" | "triangle" | "star" | "arrow";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  src?: string;
  fill?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: string;
  opacity?: number;
  borderColor?: string;
  borderWidth?: number;
  shadow?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

const templates = [
  {
    id: "promo-summer",
    name: "Promoção Verão",
    elements: [
      { id: "bg", type: "rectangle", x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rotation: 0, fill: "#fef3c7", opacity: 1 },
      { id: "photo", type: "image", x: 1080, y: 180, width: 700, height: 700, rotation: 0, src: "https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=800&q=80", opacity: 1 },
      { id: "badge", type: "circle", x: 1400, y: 90, width: 220, height: 220, rotation: 0, fill: "#f97316", opacity: 0.9 },
      { id: "badgeText", type: "text", x: 1400, y: 140, width: 220, height: 120, rotation: 0, content: "50% OFF", fill: "#fff", fontSize: 52, fontWeight: "bold", textAlign: "center", opacity: 1 },
      { id: "title", type: "text", x: 180, y: 260, width: 800, height: 120, rotation: 0, content: "Liquidação de Verão", fill: "#ea580c", fontSize: 88, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "subtitle", type: "text", x: 180, y: 380, width: 800, height: 80, rotation: 0, content: "Moda praia • Acessórios • Calçados", fill: "#92400e", fontSize: 36, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "cta", type: "rectangle", x: 180, y: 500, width: 360, height: 90, rotation: 0, fill: "#f97316", opacity: 1 },
      { id: "ctaText", type: "text", x: 180, y: 520, width: 360, height: 90, rotation: 0, content: "Compre agora", fill: "#fff", fontSize: 36, fontWeight: "bold", textAlign: "center", opacity: 1 },
    ],
  },
  {
    id: "breaking-news",
    name: "Notícia Breaking",
    elements: [
      { id: "bg", type: "rectangle", x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rotation: 0, fill: "#0f172a", opacity: 1 },
      { id: "band", type: "rectangle", x: 0, y: 0, width: CANVAS_WIDTH, height: 140, rotation: 0, fill: "#dc2626", opacity: 1 },
      { id: "bandText", type: "text", x: 40, y: 30, width: 400, height: 80, rotation: 0, content: "BREAKING NEWS", fill: "#fff", fontSize: 54, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "headline", type: "text", x: 80, y: 200, width: 1760, height: 160, rotation: 0, content: "Título principal da notícia aparece aqui em duas linhas", fill: "#fff", fontSize: 64, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "sub", type: "text", x: 80, y: 380, width: 1200, height: 120, rotation: 0, content: "Resumo curto com detalhes essenciais da notícia, horário e fonte.", fill: "#cbd5e1", fontSize: 32, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "photo", type: "image", x: 1280, y: 520, width: 560, height: 420, rotation: 0, src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80", opacity: 1 },
      { id: "footer", type: "rectangle", x: 0, y: 980, width: CANVAS_WIDTH, height: 100, rotation: 0, fill: "#1f2937", opacity: 1 },
      { id: "footerText", type: "text", x: 40, y: 1000, width: 1200, height: 60, rotation: 0, content: "Fonte: Agência / Atualizado às 10:45", fill: "#e5e7eb", fontSize: 28, fontWeight: "normal", textAlign: "left", opacity: 1 },
    ],
  },
  {
    id: "menu-burger",
    name: "Cardápio Hamburgueria",
    elements: [
      { id: "bg", type: "rectangle", x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rotation: 0, fill: "#111827", opacity: 1 },
      { id: "photo", type: "image", x: 60, y: 120, width: 820, height: 820, rotation: 0, src: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=900&q=80", opacity: 1 },
      { id: "title", type: "text", x: 940, y: 160, width: 880, height: 120, rotation: 0, content: "Burger House", fill: "#fbbf24", fontSize: 96, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "line", type: "rectangle", x: 940, y: 280, width: 520, height: 6, rotation: 0, fill: "#fbbf24", opacity: 1 },
      { id: "item1", type: "text", x: 940, y: 340, width: 820, height: 80, rotation: 0, content: "Smash Burger ................ R$ 29", fill: "#f3f4f6", fontSize: 42, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "item2", type: "text", x: 940, y: 420, width: 820, height: 80, rotation: 0, content: "Cheddar Bacon .............. R$ 34", fill: "#e5e7eb", fontSize: 36, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "item3", type: "text", x: 940, y: 500, width: 820, height: 80, rotation: 0, content: "Veggie Crispy ................ R$ 31", fill: "#e5e7eb", fontSize: 36, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "item4", type: "text", x: 940, y: 580, width: 820, height: 80, rotation: 0, content: "Combo + refri ............... R$ 39", fill: "#e5e7eb", fontSize: 36, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "cta", type: "rectangle", x: 940, y: 720, width: 320, height: 90, rotation: 0, fill: "#fbbf24", opacity: 1 },
      { id: "ctaText", type: "text", x: 940, y: 740, width: 320, height: 90, rotation: 0, content: "Peça agora", fill: "#111827", fontSize: 36, fontWeight: "bold", textAlign: "center", opacity: 1 },
      { id: "note", type: "text", x: 940, y: 840, width: 820, height: 80, rotation: 0, content: "Entrega em até 40 min • iFood / App próprio", fill: "#9ca3af", fontSize: 28, fontWeight: "normal", textAlign: "left", opacity: 1 },
    ],
  },
  {
    id: "event-show",
    name: "Evento Show",
    elements: [
      { id: "bg", type: "rectangle", x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rotation: 0, fill: "#0b1120", opacity: 1 },
      { id: "overlay", type: "image", x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rotation: 0, src: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?auto=format&fit=crop&w=1200&q=80", opacity: 0.35 },
      { id: "title", type: "text", x: 120, y: 200, width: 1600, height: 140, rotation: 0, content: "Show ao Vivo", fill: "#fff", fontSize: 96, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "date", type: "text", x: 120, y: 360, width: 900, height: 100, rotation: 0, content: "Sábado • 22h • Auditório Central", fill: "#e0f2fe", fontSize: 42, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "ticket", type: "rectangle", x: 120, y: 500, width: 420, height: 110, rotation: 0, fill: "#22c55e", opacity: 1 },
      { id: "ticketText", type: "text", x: 120, y: 520, width: 420, height: 110, rotation: 0, content: "Ingressos R$ 49", fill: "#0b1120", fontSize: 36, fontWeight: "bold", textAlign: "center", opacity: 1 },
      { id: "cta", type: "rectangle", x: 580, y: 500, width: 420, height: 110, rotation: 0, fill: "#2563eb", opacity: 1 },
      { id: "ctaText", type: "text", x: 580, y: 520, width: 420, height: 110, rotation: 0, content: "Garanta já", fill: "#fff", fontSize: 36, fontWeight: "bold", textAlign: "center", opacity: 1 },
    ],
  },
  {
    id: "welcome-corporate",
    name: "Boas-vindas Corporativo",
    elements: [
      { id: "bg", type: "rectangle", x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rotation: 0, fill: "#0f172a", opacity: 1 },
      { id: "photo", type: "image", x: 1200, y: 140, width: 600, height: 520, rotation: 0, src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=800&q=80", opacity: 0.95 },
      { id: "title", type: "text", x: 160, y: 200, width: 900, height: 140, rotation: 0, content: "Bem-vindo(a), convidado!", fill: "#e5e7eb", fontSize: 80, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "sub", type: "text", x: 160, y: 340, width: 900, height: 120, rotation: 0, content: "Check-in na recepção • Wi-Fi: Guest • Café às 10h", fill: "#cbd5e1", fontSize: 36, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "footer", type: "rectangle", x: 0, y: 960, width: CANVAS_WIDTH, height: 120, rotation: 0, fill: "#1e293b", opacity: 1 },
      { id: "footerText", type: "text", x: 160, y: 990, width: 1400, height: 80, rotation: 0, content: "Fale com a recepção para suporte • Obrigado pela visita", fill: "#e5e7eb", fontSize: 30, fontWeight: "normal", textAlign: "left", opacity: 1 },
    ],
  },
  {
    id: "weather-bar",
    name: "Tempo + Notícias",
    elements: [
      { id: "bg", type: "rectangle", x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT, rotation: 0, fill: "#0f172a", opacity: 1 },
      { id: "side", type: "rectangle", x: 1420, y: 0, width: 500, height: CANVAS_HEIGHT, rotation: 0, fill: "#111827", opacity: 0.85 },
      { id: "city", type: "text", x: 1450, y: 120, width: 440, height: 80, rotation: 0, content: "São Paulo", fill: "#fff", fontSize: 48, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "temp", type: "text", x: 1450, y: 210, width: 440, height: 120, rotation: 0, content: "28°C", fill: "#fbbf24", fontSize: 96, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "forecast", type: "text", x: 1450, y: 340, width: 440, height: 240, rotation: 0, content: "sex 28°/20°\nsáb 27°/19°\ndom 25°/18°", fill: "#e5e7eb", fontSize: 32, fontWeight: "normal", textAlign: "left", opacity: 1 },
      { id: "headline", type: "text", x: 80, y: 120, width: 1300, height: 120, rotation: 0, content: "Últimas notícias agora", fill: "#fff", fontSize: 64, fontWeight: "bold", textAlign: "left", opacity: 1 },
      { id: "news", type: "text", x: 80, y: 260, width: 1300, height: 720, rotation: 0, content: "• Manchete 1 resumida\n• Manchete 2 resumida\n• Manchete 3 resumida", fill: "#cbd5e1", fontSize: 36, fontWeight: "normal", textAlign: "left", opacity: 1 },
    ],
  },
];

export default function EditorPage() {
  const router = useRouter();
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.5);
  const [autoFit, setAutoFit] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("design");
  const [saveType, setSaveType] = useState<"image" | "video">("image");

  const selectedElement = elements.find((el) => el.id === selectedId);

  const addElement = (type: CanvasElement["type"]) => {
    const isShape = ["rectangle", "circle", "triangle", "star"].includes(type);
    const isLine = ["line", "arrow"].includes(type);
    
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type,
      x: 400,
      y: 300,
      width: type === "text" ? 400 : isLine ? 300 : 200,
      height: type === "text" ? 80 : isLine ? 4 : 200,
      rotation: 0,
      fill: isShape ? "#3b82f6" : "#000000",
      opacity: 1,
      strokeColor: isLine ? "#000000" : undefined,
      strokeWidth: isLine ? 4 : undefined,
      borderColor: isShape ? "#000000" : undefined,
      borderWidth: isShape ? 0 : undefined,
      ...(type === "text" && {
        content: "Seu texto aqui",
        fontSize: 32,
        fontWeight: "normal",
        textAlign: "left",
      }),
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const deleteElement = () => {
    if (!selectedId) return;
    setElements(elements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateElement = () => {
    if (!selectedElement) return;
    const newElement = {
      ...selectedElement,
      id: Date.now().toString(),
      x: selectedElement.x + 20,
      y: selectedElement.y + 20,
    };
    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  // Ajuste automático do zoom para caber na viewport
  useEffect(() => {
    const computeFit = () => {
      if (!autoFit) return;
      const w = viewportRef.current?.clientWidth || CANVAS_WIDTH;
      const fit = Math.min(1, Math.max(0.1, (w - 32) / CANVAS_WIDTH));
      setZoom(fit);
    };
    computeFit();
    const handler = () => computeFit();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [autoFit]);

  const loadTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setElements(template.elements);
      setSelectedId(null);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newElement: CanvasElement = {
        id: Date.now().toString(),
        type: "image",
        x: 400,
        y: 300,
        width: 400,
        height: 300,
        rotation: 0,
        src: event.target?.result as string,
        opacity: 1,
      };
      setElements([...elements, newElement]);
      setSelectedId(newElement.id);
    };
    reader.readAsDataURL(file);
  };

  const exportAsImage = async () => {
    setExporting(true);
    try {
      // Criar um canvas HTML5
      const canvas = document.createElement("canvas");
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Desenhar fundo branco
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Desenhar cada elemento
      for (const el of elements) {
        ctx.save();
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate((el.rotation * Math.PI) / 180);
        ctx.globalAlpha = el.opacity || 1;

        if (el.type === "rectangle") {
          ctx.fillStyle = el.fill || "#000000";
          ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
        } else if (el.type === "circle") {
          ctx.fillStyle = el.fill || "#000000";
          ctx.beginPath();
          ctx.arc(0, 0, el.width / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (el.type === "text") {
          ctx.fillStyle = el.fill || "#000000";
          ctx.font = `${el.fontWeight || "normal"} ${el.fontSize || 32}px Arial`;
          ctx.textAlign = (el.textAlign as CanvasTextAlign) || "left";
          ctx.textBaseline = "middle";
          ctx.fillText(el.content || "", -el.width / 2, 0);
        } else if (el.type === "image" && el.src) {
          await new Promise((resolve) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
              resolve(null);
            };
            img.src = el.src!;
          });
        }

        ctx.restore();
      }

      // Baixar imagem
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `design-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Erro ao exportar:", error);
      alert("Erro ao exportar imagem");
    } finally {
      setExporting(false);
    }
  };

  const renderCanvasToBlob = async (scale = 2): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH * scale;
    canvas.height = CANVAS_HEIGHT * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context not available");

    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const el of elements) {
      ctx.save();
      ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.globalAlpha = el.opacity || 1;

      if (el.type === "rectangle") {
        ctx.fillStyle = el.fill || "#000000";
        ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
        if (el.borderWidth) {
          ctx.strokeStyle = el.borderColor || "#000000";
          ctx.lineWidth = el.borderWidth;
          ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
        }
      } else if (el.type === "circle") {
        ctx.fillStyle = el.fill || "#000000";
        ctx.beginPath();
        ctx.arc(0, 0, el.width / 2, 0, Math.PI * 2);
        ctx.fill();
        if (el.borderWidth) {
          ctx.strokeStyle = el.borderColor || "#000000";
          ctx.lineWidth = el.borderWidth;
          ctx.stroke();
        }
      } else if (el.type === "triangle") {
        ctx.fillStyle = el.fill || "#000000";
        ctx.beginPath();
        ctx.moveTo(0, -el.height / 2);
        ctx.lineTo(-el.width / 2, el.height / 2);
        ctx.lineTo(el.width / 2, el.height / 2);
        ctx.closePath();
        ctx.fill();
      } else if (el.type === "star") {
        ctx.fillStyle = el.fill || "#000000";
        const spikes = 5;
        const outerRadius = el.width / 2;
        const innerRadius = outerRadius / 2;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const angle = (i * Math.PI) / spikes - Math.PI / 2;
          const x = radius * Math.cos(angle);
          const y = radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (el.type === "line") {
        ctx.strokeStyle = el.strokeColor || el.fill || "#000000";
        ctx.lineWidth = el.strokeWidth || 4;
        ctx.beginPath();
        ctx.moveTo(-el.width / 2, 0);
        ctx.lineTo(el.width / 2, 0);
        ctx.stroke();
      } else if (el.type === "arrow") {
        ctx.fillStyle = el.strokeColor || el.fill || "#000000";
        const bodyWidth = el.width * 0.85;
        const bodyHeight = el.strokeWidth || 4;
        ctx.fillRect(-el.width / 2, -bodyHeight / 2, bodyWidth, bodyHeight);
        ctx.beginPath();
        ctx.moveTo(el.width / 2 - bodyWidth + el.width / 2, 0);
        ctx.lineTo(el.width / 2 - bodyWidth + el.width / 2 - 20, -15);
        ctx.lineTo(el.width / 2 - bodyWidth + el.width / 2 - 20, 15);
        ctx.closePath();
        ctx.fill();
      } else if (el.type === "text") {
        ctx.fillStyle = el.fill || "#000000";
        ctx.font = `${el.fontWeight || "normal"} ${el.fontSize || 32}px Arial`;
        ctx.textAlign = (el.textAlign as CanvasTextAlign) || "left";
        ctx.textBaseline = "middle";
        ctx.fillText(el.content || "", -el.width / 2, 0);
      } else if (el.type === "image" && el.src) {
        await new Promise((resolve) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
            resolve(null);
          };
          img.src = el.src!;
        });
      }

      ctx.restore();
    }

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/png");
    });
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const blob = await renderCanvasToBlob(2);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${saveName}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setSaveDialogOpen(false);
    } catch (error) {
      console.error("Erro ao baixar:", error);
      alert("Erro ao baixar imagem");
    } finally {
      setExporting(false);
    }
  };

  const handleSaveToAssets = async () => {
    setExporting(true);
    try {
      const blob = await renderCanvasToBlob(2);
      const file = new File([blob], `${saveName}.png`, { type: "image/png" });
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", saveName);

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let detail = "";
        try {
          const err = await response.json();
          detail = err?.error || "";
        } catch (_) {
          detail = await response.text();
        }
        throw new Error(detail || "Falha ao salvar em Mídias");
      }

      setSaveDialogOpen(false);
      alert("Design salvo em Mídias com sucesso!");
      router.push("/dashboard/assets");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar em Mídias");
    } finally {
      setExporting(false);
    }
  };

  const handleClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedId(elementId);
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedId(elementId);
    setIsDragging(true);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const element = elements.find((el) => el.id === elementId);
      if (element) {
        setDragStart({
          x: (e.clientX - rect.left) / zoom - element.x,
          y: (e.clientY - rect.top) / zoom - element.y,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedId) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = (e.clientX - rect.left) / zoom;
      const mouseY = (e.clientY - rect.top) / zoom;
      updateElement(selectedId, {
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Editor de Canvas</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoFit(false);
              setZoom(Math.max(0.25, zoom - 0.1));
            }}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-500">{Math.round(zoom * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAutoFit(false);
              setZoom(Math.min(2, zoom + 0.1));
            }}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAutoFit(true)}>
            Ajustar à tela
          </Button>
          <Button onClick={() => setSaveDialogOpen(true)} disabled={elements.length === 0} className="bg-orange-500 hover:bg-orange-600">
            <Download className="mr-2 h-4 w-4" />
            Salvar Design
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Esquerda - Ferramentas */}
        <div className="w-72 space-y-5 overflow-auto border-r border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Templates</h3>
            <div className="space-y-2">
              {templates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  onClick={() => loadTemplate(template.id)}
                >
                  <Palette className="mr-2 h-4 w-4" />
                  {template.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Adicionar Elemento</h3>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={() => addElement("text")}>
                <Type className="mr-2 h-4 w-4" />
                Texto
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={() => addElement("rectangle")}>
                <Square className="mr-2 h-4 w-4" />
                Retângulo
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={() => addElement("circle")}>
                <Circle className="mr-2 h-4 w-4" />
                Círculo
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={() => addElement("triangle")}>
                <Triangle className="mr-2 h-4 w-4" />
                Triângulo
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={() => addElement("star")}>
                <Star className="mr-2 h-4 w-4" />
                Estrela
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={() => addElement("line")}>
                <Minus className="mr-2 h-4 w-4" />
                Linha
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={() => addElement("arrow")}>
                <MoveRight className="mr-2 h-4 w-4" />
                Seta
              </Button>
              <label className="block">
                <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" asChild>
                  <span>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Imagem
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
              </label>
            </div>
          </div>

          {selectedElement && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Ações</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100" onClick={duplicateElement}>
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicar
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start rounded-lg border-slate-200 bg-slate-50 text-destructive hover:bg-slate-100" onClick={deleteElement}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div
          ref={viewportRef}
          className="flex-1 overflow-auto bg-slate-100 p-6"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            ref={canvasRef}
            className="relative mx-auto rounded-xl bg-white shadow-lg"
            style={{
              width: CANVAS_WIDTH * zoom,
              height: CANVAS_HEIGHT * zoom,
              backgroundImage:
                "linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)",
              backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            }}
            onClick={() => setSelectedId(null)}
          >
            {elements.map((element) => (
              <div
                key={element.id}
                className={`absolute cursor-move ${selectedId === element.id ? "ring-2 ring-primary" : ""}`}
                style={{
                  left: element.x * zoom,
                  top: element.y * zoom,
                  width: element.width * zoom,
                  height: element.height * zoom,
                  transform: `rotate(${element.rotation}deg)`,
                  opacity: element.opacity,
                }}
                onClick={(e) => handleClick(e, element.id)}
                onMouseDown={(e) => handleMouseDown(e, element.id)}
              >
                {element.type === "rectangle" && (
                  <div className="h-full w-full" style={{ 
                    backgroundColor: element.fill,
                    border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor}` : undefined,
                    boxShadow: element.shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : undefined,
                  }} />
                )}
                {element.type === "circle" && (
                  <div className="h-full w-full rounded-full" style={{ 
                    backgroundColor: element.fill,
                    border: element.borderWidth ? `${element.borderWidth}px solid ${element.borderColor}` : undefined,
                    boxShadow: element.shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : undefined,
                  }} />
                )}
                {element.type === "triangle" && (
                  <div className="h-full w-full" style={{
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                    backgroundColor: element.fill,
                    filter: element.shadow ? 'drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07))' : undefined,
                  }} />
                )}
                {element.type === "star" && (
                  <div className="h-full w-full" style={{
                    clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                    backgroundColor: element.fill,
                    filter: element.shadow ? 'drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07))' : undefined,
                  }} />
                )}
                {element.type === "line" && (
                  <div className="h-full w-full" style={{ 
                    backgroundColor: element.strokeColor || element.fill,
                    boxShadow: element.shadow ? '0 1px 3px rgba(0, 0, 0, 0.12)' : undefined,
                  }} />
                )}
                {element.type === "arrow" && (
                  <div className="relative h-full w-full">
                    <div className="absolute inset-0" style={{ 
                      backgroundColor: element.strokeColor || element.fill,
                      width: '85%',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }} />
                    <div className="absolute" style={{
                      right: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 0,
                      height: 0,
                      borderLeft: `${element.height * 2}px solid ${element.strokeColor || element.fill}`,
                      borderTop: `${element.height * 1.5}px solid transparent`,
                      borderBottom: `${element.height * 1.5}px solid transparent`,
                    }} />
                  </div>
                )}
                {element.type === "text" && (
                  <div
                    className="flex h-full w-full items-center"
                    style={{
                      color: element.fill,
                      fontSize: (element.fontSize || 32) * zoom,
                      fontWeight: element.fontWeight,
                      textAlign: element.textAlign as any,
                      textShadow: element.shadow ? '0 2px 4px rgba(0, 0, 0, 0.1)' : undefined,
                    }}
                  >
                    {element.content}
                  </div>
                )}
                {element.type === "image" && element.src && (
                  <img src={element.src || "/placeholder.svg"} alt="" className="h-full w-full object-cover" style={{
                    boxShadow: element.shadow ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : undefined,
                  }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Direita - Propriedades */}
        <div className="w-80 space-y-4 overflow-auto border-l border-slate-200 bg-slate-900 text-slate-50 p-4">
          {selectedElement ? (
            <>
              <h3 className="text-sm font-semibold text-white">Propriedades</h3>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-100">Posição X</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedElement.x)}
                    onChange={(e) => updateElement(selectedElement.id, { x: Number(e.target.value) })}
                    className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <Label className="text-slate-100">Posição Y</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedElement.y)}
                    onChange={(e) => updateElement(selectedElement.id, { y: Number(e.target.value) })}
                    className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <Label className="text-slate-100">Largura</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedElement.width)}
                    onChange={(e) => updateElement(selectedElement.id, { width: Number(e.target.value) })}
                    className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <Label className="text-slate-100">Altura</Label>
                  <Input
                    type="number"
                    value={Math.round(selectedElement.height)}
                    onChange={(e) => updateElement(selectedElement.id, { height: Number(e.target.value) })}
                    className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <Label className="text-slate-100">Rotação ({selectedElement.rotation}°)</Label>
                  <Slider
                    value={[selectedElement.rotation]}
                    onValueChange={([value]) => updateElement(selectedElement.id, { rotation: value })}
                    min={0}
                    max={360}
                    step={1}
                    className="text-white"
                  />
                </div>

                <div>
                  <Label className="text-slate-100">Opacidade ({Math.round((selectedElement.opacity || 1) * 100)}%)</Label>
                  <Slider
                    value={[(selectedElement.opacity || 1) * 100]}
                    onValueChange={([value]) => updateElement(selectedElement.id, { opacity: value / 100 })}
                    min={0}
                    max={100}
                    step={1}
                    className="text-white"
                  />
                </div>

                {["rectangle", "circle", "triangle", "star"].includes(selectedElement.type) && (
                  <>
                    <div>
                      <Label className="text-slate-100">Cor da Borda</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedElement.borderColor || "#000000"}
                          onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })}
                          className="h-10 w-20 bg-slate-800 text-white border-slate-700"
                        />
                        <Input
                          type="text"
                          value={selectedElement.borderColor || "#000000"}
                          onChange={(e) => updateElement(selectedElement.id, { borderColor: e.target.value })}
                          placeholder="#000000"
                          className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-100">Espessura da Borda</Label>
                      <Input
                        type="number"
                        value={selectedElement.borderWidth || 0}
                        onChange={(e) => updateElement(selectedElement.id, { borderWidth: Number(e.target.value) })}
                        min={0}
                        className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </>
                )}

                {["line", "arrow"].includes(selectedElement.type) && (
                  <>
                    <div>
                      <Label className="text-slate-100">Cor da Linha</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={selectedElement.strokeColor || "#000000"}
                          onChange={(e) => updateElement(selectedElement.id, { strokeColor: e.target.value })}
                          className="h-10 w-20 bg-slate-800 text-white border-slate-700"
                        />
                        <Input
                          type="text"
                          value={selectedElement.strokeColor || "#000000"}
                          onChange={(e) => updateElement(selectedElement.id, { strokeColor: e.target.value })}
                          placeholder="#000000"
                          className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-100">Espessura</Label>
                      <Input
                        type="number"
                        value={selectedElement.strokeWidth || 4}
                        onChange={(e) => updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) })}
                        min={1}
                        className="bg-slate-800 text-white border-slate-700 placeholder:text-slate-400"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shadow"
                    checked={selectedElement.shadow || false}
                    onChange={(e) => updateElement(selectedElement.id, { shadow: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="shadow" className="cursor-pointer text-slate-100">Sombra</Label>
                </div>

                {selectedElement.type === "text" && (
                  <>
                    <div>
                      <Label className="text-slate-100">Texto</Label>
                      <Input
                        value={selectedElement.content || ""}
                        onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })}
                        className="bg-slate-800 text-slate-50 border-slate-700 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-100">Tamanho da Fonte</Label>
                      <Input
                        type="number"
                        value={selectedElement.fontSize || 32}
                        onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                        className="bg-slate-800 text-slate-50 border-slate-700 placeholder:text-slate-400"
                      />
                    </div>

                    <div>
                      <Label className="text-slate-100">Peso da Fonte</Label>
                      <Select
                        value={selectedElement.fontWeight || "normal"}
                        onValueChange={(value) => updateElement(selectedElement.id, { fontWeight: value })}
                      >
                        <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-700 hover:bg-slate-700/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="bold">Negrito</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-slate-100">Alinhamento</Label>
                      <Select
                        value={selectedElement.textAlign || "left"}
                        onValueChange={(value) => updateElement(selectedElement.id, { textAlign: value })}
                      >
                        <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-700 hover:bg-slate-700/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Esquerda</SelectItem>
                          <SelectItem value="center">Centro</SelectItem>
                          <SelectItem value="right">Direita</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {(selectedElement.type === "rectangle" || selectedElement.type === "circle" || selectedElement.type === "text") && (
                  <div>
                    <Label className="text-slate-100">Cor</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedElement.fill || "#000000"}
                        onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                        className={`h-10 w-20 bg-slate-800 text-slate-50 border-slate-700 placeholder:text-slate-400`}
                      />
                      <Input
                        type="text"
                        value={selectedElement.fill || "#000000"}
                        onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              Selecione um elemento para editar suas propriedades
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Salvamento */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Design</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-slate-100">Nome do Arquivo</Label>
              <Input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="design"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Salvando..." : "Baixar (2x)"}
            </Button>
            <Button onClick={handleSaveToAssets} disabled={exporting}>
              <Upload className="mr-2 h-4 w-4" />
              {exporting ? "Salvando..." : "Salvar em Mídias (2x)"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



